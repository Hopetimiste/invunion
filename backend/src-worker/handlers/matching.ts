/**
 * Invunion Worker — /pubsub/matching handler
 *
 * Receives a Pub/Sub push message requesting invoice-transaction matching
 * for a given tenant.  Phase 1 (M6) implements deterministic pre-filtering
 * to find high-confidence candidates.  Phase 2 (M7) will call Vertex AI
 * Gemini 2.0 Flash for AI-powered scoring of ambiguous candidates.
 *
 * Decoded payload schema (MatchingPayload):
 * {
 *   tenantId:     string
 *   triggeredBy?: "ingest" | "manual" | "scheduled"
 *   triggeredAt?: string  // ISO 8601
 * }
 *
 * Pre-filter rules (deterministic matching):
 *   - amount within ±10%
 *   - date within ±30 days
 *   - same currency
 *   - status: transaction must be 'pending', invoice must be 'pending'/'overdue'
 *
 * Scoring thresholds (to be finalised in M7):
 *   ≥ 85 % → auto-match (confidence 'high')
 *   50–85 % → queued for review (confidence 'medium')
 *   < 50 % → skip
 */

import { Request, Response } from 'express';
import { query, transaction as dbTransaction } from '../db.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PubSubEnvelope {
  message: { data: string; messageId: string; publishTime: string };
  subscription: string;
}

interface MatchingPayload {
  tenantId: string;
  triggeredBy?: string;
  triggeredAt?: string;
}

interface UnmatchedTransaction {
  id: string;
  amount: number;
  currency: string;
  direction: string;
  date: Date;
  description: string | null;
  counterparty_name: string | null;
}

interface UnmatchedInvoice {
  id: string;
  amount: number;
  currency: string;
  direction: string; // 'receivable' | 'payable'
  issue_date: Date;
  due_date: Date | null;
  counterparty_name: string | null;
  status: string;
}

interface MatchCandidate {
  transactionId: string;
  invoiceId: string;
  score: number; // 0–100
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
}

interface MatchingResult {
  autoMatched: number;
  pendingReview: number;
  skipped: number;
}

// ─── Decode ───────────────────────────────────────────────────────────────────

function decodePayload(envelope: PubSubEnvelope): MatchingPayload {
  const raw = Buffer.from(envelope.message.data, 'base64').toString('utf-8');
  return JSON.parse(raw) as MatchingPayload;
}

// ─── Pre-filter: fetch candidates ────────────────────────────────────────────

async function fetchUnmatchedTransactions(tenantId: string): Promise<UnmatchedTransaction[]> {
  const result = await query<UnmatchedTransaction>(
    `SELECT id, amount, currency, direction, date, description, counterparty_name
       FROM transactions
      WHERE tenant_id = $1
        AND status = 'pending'
        AND id NOT IN (SELECT transaction_id FROM matches WHERE transaction_id IS NOT NULL)
      ORDER BY date DESC
      LIMIT 500`,
    [tenantId]
  );
  return result.rows;
}

async function fetchUnmatchedInvoices(tenantId: string): Promise<UnmatchedInvoice[]> {
  const result = await query<UnmatchedInvoice>(
    `SELECT id, amount, currency, direction, issue_date, due_date,
            counterparty_name, status
       FROM invoices
      WHERE tenant_id = $1
        AND status IN ('pending', 'overdue')
        AND id NOT IN (SELECT invoice_id FROM matches WHERE invoice_id IS NOT NULL)
      ORDER BY issue_date DESC
      LIMIT 500`,
    [tenantId]
  );
  return result.rows;
}

// ─── Deterministic scoring ────────────────────────────────────────────────────

function scoreCandidate(
  tx: UnmatchedTransaction,
  inv: UnmatchedInvoice
): MatchCandidate | null {
  const reasons: string[] = [];
  let score = 0;

  // Currency must match exactly
  if (tx.currency !== inv.currency) return null;
  reasons.push('currency_match');
  score += 20;

  // Direction compatibility: debit → payable, credit → receivable
  const dirMatch =
    (tx.direction === 'debit' && inv.direction === 'payable') ||
    (tx.direction === 'credit' && inv.direction === 'receivable');
  if (!dirMatch) return null;
  reasons.push('direction_match');
  score += 20;

  // Amount within ±10%
  const amountRatio = Math.abs(tx.amount - inv.amount) / inv.amount;
  if (amountRatio > 0.1) return null;
  const amountScore = Math.round((1 - amountRatio / 0.1) * 30); // 0–30
  score += amountScore;
  reasons.push(`amount_delta_${(amountRatio * 100).toFixed(1)}pct`);

  // Date within ±30 days of issue_date
  const txDate = new Date(tx.date).getTime();
  const invDate = new Date(inv.issue_date).getTime();
  const diffDays = Math.abs(txDate - invDate) / (1000 * 60 * 60 * 24);
  if (diffDays > 30) return null;
  const dateScore = Math.round((1 - diffDays / 30) * 20); // 0–20
  score += dateScore;
  reasons.push(`date_delta_${diffDays.toFixed(0)}d`);

  // Bonus: counterparty name fuzzy match (simple contains check for now)
  if (
    tx.counterparty_name &&
    inv.counterparty_name &&
    tx.counterparty_name.toLowerCase().includes(inv.counterparty_name.toLowerCase().slice(0, 5))
  ) {
    score += 10;
    reasons.push('counterparty_name_partial');
  }

  const confidence: MatchCandidate['confidence'] =
    score >= 85 ? 'high' : score >= 50 ? 'medium' : 'low';

  return {
    transactionId: tx.id,
    invoiceId: inv.id,
    score,
    confidence,
    reasons,
  };
}

// ─── Persist matches ──────────────────────────────────────────────────────────

async function persistMatches(
  tenantId: string,
  candidates: MatchCandidate[]
): Promise<MatchingResult> {
  let autoMatched = 0;
  let pendingReview = 0;
  let skipped = 0;

  const autoMatchCandidates = candidates.filter((c) => c.confidence === 'high');
  const reviewCandidates = candidates.filter((c) => c.confidence === 'medium');

  await dbTransaction(async (client) => {
    // Auto-match high-confidence pairs
    for (const c of autoMatchCandidates) {
      await client.query(
        `INSERT INTO matches
           (tenant_id, transaction_id, invoice_id, match_type, status,
            confidence_score, match_reasons, matched_at)
         VALUES ($1, $2, $3, 'automatic', 'confirmed', $4, $5, NOW())
         ON CONFLICT DO NOTHING`,
        [tenantId, c.transactionId, c.invoiceId, c.score, JSON.stringify(c.reasons)]
      );

      // Mark both as matched
      await client.query(
        `UPDATE transactions SET status = 'matched' WHERE id = $1 AND tenant_id = $2`,
        [c.transactionId, tenantId]
      );
      await client.query(
        `UPDATE invoices SET status = 'matched' WHERE id = $1 AND tenant_id = $2`,
        [c.invoiceId, tenantId]
      );

      autoMatched++;
    }

    // Queue medium-confidence for human review
    for (const c of reviewCandidates) {
      await client.query(
        `INSERT INTO matches
           (tenant_id, transaction_id, invoice_id, match_type, status,
            confidence_score, match_reasons, matched_at)
         VALUES ($1, $2, $3, 'automatic', 'pending_review', $4, $5, NOW())
         ON CONFLICT DO NOTHING`,
        [tenantId, c.transactionId, c.invoiceId, c.score, JSON.stringify(c.reasons)]
      );
      pendingReview++;
    }
  });

  skipped = candidates.filter((c) => c.confidence === 'low').length;
  return { autoMatched, pendingReview, skipped };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function handleMatching(req: Request, res: Response): Promise<void> {
  const envelope = req.body as PubSubEnvelope;

  if (!envelope?.message?.data) {
    console.warn('[Worker/matching] Invalid Pub/Sub envelope');
    res.status(400).json({ success: false, error: 'Invalid Pub/Sub envelope' });
    return;
  }

  let payload: MatchingPayload;
  try {
    payload = decodePayload(envelope);
    if (!payload.tenantId) throw new Error('Missing tenantId');
  } catch (err: any) {
    console.error('[Worker/matching] Payload error', err.message);
    res.status(400).json({ success: false, error: err.message });
    return;
  }

  const { tenantId } = payload;

  console.log(
    JSON.stringify({
      type: 'MATCHING_START',
      tenantId,
      triggeredBy: payload.triggeredBy ?? 'unknown',
      messageId: envelope.message.messageId,
    })
  );

  try {
    const [transactions, invoices] = await Promise.all([
      fetchUnmatchedTransactions(tenantId),
      fetchUnmatchedInvoices(tenantId),
    ]);

    console.log(
      `[Worker/matching] Tenant ${tenantId}: ${transactions.length} transactions, ${invoices.length} invoices to process`
    );

    // Build candidate matrix (O(n×m) — acceptable for ≤500×500 with early exits)
    const candidates: MatchCandidate[] = [];
    const matchedTxIds = new Set<string>();
    const matchedInvIds = new Set<string>();

    for (const tx of transactions) {
      if (matchedTxIds.has(tx.id)) continue;
      for (const inv of invoices) {
        if (matchedInvIds.has(inv.id)) continue;
        const candidate = scoreCandidate(tx, inv);
        if (candidate && candidate.confidence !== 'low') {
          candidates.push(candidate);
          // Greedily assign high-confidence matches
          if (candidate.confidence === 'high') {
            matchedTxIds.add(tx.id);
            matchedInvIds.add(inv.id);
            break;
          }
        }
      }
    }

    const result = await persistMatches(tenantId, candidates);

    console.log(
      JSON.stringify({
        type: 'MATCHING_DONE',
        tenantId,
        ...result,
        candidatesEvaluated: candidates.length,
        messageId: envelope.message.messageId,
      })
    );

    // Trigger alerts job now that matching is done
    if (result.autoMatched > 0 || result.pendingReview > 0) {
      await triggerAlertsJob(tenantId);
    }

    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    console.error('[Worker/matching] Processing error', err);
    res.status(500).json({ success: false, error: 'Matching failed' });
  }
}

// ─── Trigger alerts job ───────────────────────────────────────────────────────

async function triggerAlertsJob(tenantId: string): Promise<void> {
  try {
    const { PubSub } = await import('@google-cloud/pubsub');
    const pubsub = new PubSub();
    const topicName = process.env.PUBSUB_TOPIC_ALERTS || 'alerts';
    const message = Buffer.from(
      JSON.stringify({ tenantId, triggeredBy: 'matching', triggeredAt: new Date().toISOString() })
    );
    await pubsub.topic(topicName).publishMessage({ data: message });
    console.log(`[Worker/matching] Triggered alerts job for tenant ${tenantId}`);
  } catch (err) {
    console.error('[Worker/matching] Failed to trigger alerts job', err);
  }
}
