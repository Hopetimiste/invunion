/**
 * Invunion Worker — /pubsub/alerts handler
 *
 * Receives a Pub/Sub push message requesting alert generation for a tenant.
 * Scans the database for alert conditions and creates alert records.
 *
 * Alert types generated:
 *   - payment_overdue   — invoice past due_date with no match
 *   - match_found       — new auto-match created (notify user)
 *   - unmatched_old     — transaction older than 60 days with no match
 *
 * Decoded payload:
 * {
 *   tenantId:     string
 *   triggeredBy?: "matching" | "scheduled" | "manual"
 *   triggeredAt?: string  // ISO 8601
 * }
 */

import { Request, Response } from 'express';
import { query, transaction as dbTransaction } from '../db.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PubSubEnvelope {
  message: { data: string; messageId: string; publishTime: string };
  subscription: string;
}

interface AlertsPayload {
  tenantId: string;
  triggeredBy?: string;
  triggeredAt?: string;
}

interface AlertRow {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  reference_id?: string;
  reference_type?: string;
}

interface AlertsResult {
  created: number;
  deduped: number; // already existed, skipped
}

// ─── Decode ───────────────────────────────────────────────────────────────────

function decodePayload(envelope: PubSubEnvelope): AlertsPayload {
  const raw = Buffer.from(envelope.message.data, 'base64').toString('utf-8');
  return JSON.parse(raw) as AlertsPayload;
}

// ─── Alert condition checks ───────────────────────────────────────────────────

async function buildAlerts(tenantId: string): Promise<Omit<AlertRow, 'id'>[]> {
  const alerts: Omit<AlertRow, 'id'>[] = [];

  // 1. Overdue invoices (due_date < now, status not matched/paid)
  const overdueResult = await query(
    `SELECT id, invoice_number, amount, currency, due_date, counterparty_name
       FROM invoices
      WHERE tenant_id = $1
        AND due_date < NOW()
        AND status NOT IN ('matched', 'paid', 'cancelled')
      ORDER BY due_date ASC
      LIMIT 100`,
    [tenantId]
  );

  for (const inv of overdueResult.rows) {
    const daysOverdue = Math.floor(
      (Date.now() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24)
    );
    alerts.push({
      type: 'payment_overdue',
      severity: daysOverdue > 30 ? 'critical' : 'warning',
      title: `Invoice overdue by ${daysOverdue} day${daysOverdue > 1 ? 's' : ''}`,
      message: `Invoice ${inv.invoice_number ?? inv.id} for ${inv.counterparty_name ?? 'unknown'} (${inv.amount} ${inv.currency}) was due on ${new Date(inv.due_date).toLocaleDateString()}.`,
      reference_id: inv.id,
      reference_type: 'invoice',
    });
  }

  // 2. New auto-matches created in the last 24 hours
  const recentMatchesResult = await query(
    `SELECT m.id, m.transaction_id, m.invoice_id, m.confidence_score,
            i.invoice_number, i.amount, i.currency, i.counterparty_name
       FROM matches m
       JOIN invoices i ON i.id = m.invoice_id
      WHERE m.tenant_id = $1
        AND m.match_type = 'automatic'
        AND m.status = 'confirmed'
        AND m.matched_at > NOW() - INTERVAL '24 hours'
      LIMIT 50`,
    [tenantId]
  );

  for (const m of recentMatchesResult.rows) {
    alerts.push({
      type: 'match_found',
      severity: 'info',
      title: 'New automatic match',
      message: `Invoice ${m.invoice_number ?? m.invoice_id} (${m.amount} ${m.currency}, ${m.counterparty_name ?? 'unknown'}) was automatically matched with confidence ${m.confidence_score}%.`,
      reference_id: m.id,
      reference_type: 'match',
    });
  }

  // 3. Old unmatched transactions (> 60 days)
  const oldTxResult = await query(
    `SELECT id, amount, currency, direction, date, counterparty_name
       FROM transactions
      WHERE tenant_id = $1
        AND status = 'pending'
        AND date < NOW() - INTERVAL '60 days'
        AND id NOT IN (SELECT transaction_id FROM matches WHERE transaction_id IS NOT NULL)
      ORDER BY date ASC
      LIMIT 50`,
    [tenantId]
  );

  for (const tx of oldTxResult.rows) {
    alerts.push({
      type: 'unmatched_old',
      severity: 'warning',
      title: 'Transaction unmatched for over 60 days',
      message: `Transaction of ${tx.amount} ${tx.currency} (${tx.direction}) from ${new Date(tx.date).toLocaleDateString()} has not been matched.`,
      reference_id: tx.id,
      reference_type: 'transaction',
    });
  }

  return alerts;
}

// ─── Persist alerts (with deduplication) ────────────────────────────────────

async function persistAlerts(
  tenantId: string,
  alerts: Omit<AlertRow, 'id'>[]
): Promise<AlertsResult> {
  let created = 0;
  let deduped = 0;

  if (alerts.length === 0) return { created: 0, deduped: 0 };

  await dbTransaction(async (client) => {
    for (const alert of alerts) {
      // Deduplicate: skip if same (type, reference_id, tenant) exists and is unread
      const existing = await client.query(
        `SELECT id FROM alerts
          WHERE tenant_id = $1
            AND type = $2
            AND reference_id = $3
            AND status = 'unread'
          LIMIT 1`,
        [tenantId, alert.type, alert.reference_id ?? null]
      );

      if ((existing.rowCount ?? 0) > 0) {
        deduped++;
        continue;
      }

      await client.query(
        `INSERT INTO alerts
           (tenant_id, type, severity, title, message,
            reference_id, reference_type, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'unread', NOW())`,
        [
          tenantId,
          alert.type,
          alert.severity,
          alert.title,
          alert.message,
          alert.reference_id ?? null,
          alert.reference_type ?? null,
        ]
      );
      created++;
    }
  });

  return { created, deduped };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function handleAlerts(req: Request, res: Response): Promise<void> {
  const envelope = req.body as PubSubEnvelope;

  if (!envelope?.message?.data) {
    console.warn('[Worker/alerts] Invalid Pub/Sub envelope');
    res.status(400).json({ success: false, error: 'Invalid Pub/Sub envelope' });
    return;
  }

  let payload: AlertsPayload;
  try {
    payload = decodePayload(envelope);
    if (!payload.tenantId) throw new Error('Missing tenantId');
  } catch (err: any) {
    console.error('[Worker/alerts] Payload error', err.message);
    res.status(400).json({ success: false, error: err.message });
    return;
  }

  const { tenantId } = payload;

  console.log(
    JSON.stringify({
      type: 'ALERTS_START',
      tenantId,
      triggeredBy: payload.triggeredBy ?? 'unknown',
      messageId: envelope.message.messageId,
    })
  );

  try {
    const alertsToCreate = await buildAlerts(tenantId);
    const result = await persistAlerts(tenantId, alertsToCreate);

    console.log(
      JSON.stringify({
        type: 'ALERTS_DONE',
        tenantId,
        ...result,
        evaluated: alertsToCreate.length,
        messageId: envelope.message.messageId,
      })
    );

    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    console.error('[Worker/alerts] Processing error', err);
    res.status(500).json({ success: false, error: 'Alert generation failed' });
  }
}
