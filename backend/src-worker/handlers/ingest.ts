/**
 * Invunion Worker — /pubsub/ingest handler
 *
 * Receives a Pub/Sub push message containing raw transactions or invoices,
 * normalises the payload and persists it to PostgreSQL.
 *
 * Pub/Sub push envelope:
 * {
 *   message: { data: "<base64-json>", messageId: "…", publishTime: "…" },
 *   subscription: "projects/…/subscriptions/…"
 * }
 *
 * Decoded payload schema (IngestPayload):
 * {
 *   tenantId:  string
 *   source:    "csv" | "webhook" | "bank"
 *   type:      "transaction" | "invoice"
 *   records:   RawTransaction[] | RawInvoice[]
 * }
 */

import { Request, Response } from 'express';
import { query, transaction } from '../db.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PubSubMessage {
  data: string; // base64-encoded JSON
  messageId: string;
  publishTime: string;
  attributes?: Record<string, string>;
}

interface PubSubEnvelope {
  message: PubSubMessage;
  subscription: string;
}

interface RawTransaction {
  external_id?: string;
  amount: number;
  currency: string;
  direction: 'debit' | 'credit';
  description?: string;
  counterparty_name?: string;
  date: string; // ISO 8601
  bank_account_id?: string;
  metadata?: Record<string, unknown>;
}

interface RawInvoice {
  external_id?: string;
  invoice_number?: string;
  amount: number;
  currency: string;
  direction: 'receivable' | 'payable';
  counterparty_name?: string;
  issue_date: string; // ISO 8601
  due_date?: string; // ISO 8601
  status?: string;
  metadata?: Record<string, unknown>;
}

type IngestType = 'transaction' | 'invoice';
type IngestSource = 'csv' | 'webhook' | 'bank';

interface IngestPayload {
  tenantId: string;
  source: IngestSource;
  type: IngestType;
  records: RawTransaction[] | RawInvoice[];
}

interface IngestResult {
  inserted: number;
  skipped: number; // duplicates (external_id already exists)
  errors: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function decodePubSubData(envelope: PubSubEnvelope): IngestPayload {
  const raw = Buffer.from(envelope.message.data, 'base64').toString('utf-8');
  return JSON.parse(raw) as IngestPayload;
}

function validatePayload(payload: IngestPayload): void {
  if (!payload.tenantId) throw new Error('Missing tenantId');
  if (!payload.type || !['transaction', 'invoice'].includes(payload.type)) {
    throw new Error(`Invalid type: ${payload.type}`);
  }
  if (!Array.isArray(payload.records) || payload.records.length === 0) {
    throw new Error('records must be a non-empty array');
  }
}

// ─── Transaction ingestion ────────────────────────────────────────────────────

async function ingestTransactions(
  tenantId: string,
  records: RawTransaction[],
  source: IngestSource
): Promise<IngestResult> {
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  await transaction(async (client) => {
    for (const rec of records) {
      try {
        const existing = rec.external_id
          ? await client.query(
              'SELECT id FROM transactions WHERE tenant_id = $1 AND external_id = $2',
              [tenantId, rec.external_id]
            )
          : { rowCount: 0 };

        if ((existing.rowCount ?? 0) > 0) {
          skipped++;
          continue;
        }

        await client.query(
          `INSERT INTO transactions
             (tenant_id, external_id, amount, currency, direction, description,
              counterparty_name, date, bank_account_id, metadata, source, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending')`,
          [
            tenantId,
            rec.external_id ?? null,
            rec.amount,
            rec.currency,
            rec.direction,
            rec.description ?? null,
            rec.counterparty_name ?? null,
            rec.date,
            rec.bank_account_id ?? null,
            rec.metadata ? JSON.stringify(rec.metadata) : null,
            source,
          ]
        );
        inserted++;
      } catch (err) {
        errors++;
        console.error('[Worker] Failed to insert transaction', { rec, err });
      }
    }
  });

  return { inserted, skipped, errors };
}

// ─── Invoice ingestion ────────────────────────────────────────────────────────

async function ingestInvoices(
  tenantId: string,
  records: RawInvoice[],
  source: IngestSource
): Promise<IngestResult> {
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  await transaction(async (client) => {
    for (const rec of records) {
      try {
        const existing = rec.external_id
          ? await client.query(
              'SELECT id FROM invoices WHERE tenant_id = $1 AND external_id = $2',
              [tenantId, rec.external_id]
            )
          : { rowCount: 0 };

        if ((existing.rowCount ?? 0) > 0) {
          skipped++;
          continue;
        }

        await client.query(
          `INSERT INTO invoices
             (tenant_id, external_id, invoice_number, amount, currency, direction,
              counterparty_name, issue_date, due_date, status, metadata, source)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            tenantId,
            rec.external_id ?? null,
            rec.invoice_number ?? null,
            rec.amount,
            rec.currency,
            rec.direction,
            rec.counterparty_name ?? null,
            rec.issue_date,
            rec.due_date ?? null,
            rec.status ?? 'pending',
            rec.metadata ? JSON.stringify(rec.metadata) : null,
            source,
          ]
        );
        inserted++;
      } catch (err) {
        errors++;
        console.error('[Worker] Failed to insert invoice', { rec, err });
      }
    }
  });

  return { inserted, skipped, errors };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function handleIngest(req: Request, res: Response): Promise<void> {
  const envelope = req.body as PubSubEnvelope;

  // Pub/Sub always sends a message envelope
  if (!envelope?.message?.data) {
    console.warn('[Worker/ingest] Invalid Pub/Sub envelope', req.body);
    res.status(400).json({ success: false, error: 'Invalid Pub/Sub envelope' });
    return;
  }

  let payload: IngestPayload;
  try {
    payload = decodePubSubData(envelope);
    validatePayload(payload);
  } catch (err: any) {
    console.error('[Worker/ingest] Payload decode/validate error', err.message);
    // Return 400 → Pub/Sub will NOT retry (invalid messages go to DLQ after maxDeliveryAttempts)
    res.status(400).json({ success: false, error: err.message });
    return;
  }

  const { tenantId, type, source, records } = payload;

  console.log(
    JSON.stringify({
      type: 'INGEST_START',
      tenantId,
      recordType: type,
      source,
      count: records.length,
      messageId: envelope.message.messageId,
    })
  );

  try {
    let result: IngestResult;

    if (type === 'transaction') {
      result = await ingestTransactions(tenantId, records as RawTransaction[], source);
    } else {
      result = await ingestInvoices(tenantId, records as RawInvoice[], source);
    }

    console.log(
      JSON.stringify({
        type: 'INGEST_DONE',
        tenantId,
        recordType: type,
        ...result,
        messageId: envelope.message.messageId,
      })
    );

    // Publish matching job if new transactions were inserted
    if (type === 'transaction' && result.inserted > 0) {
      await triggerMatchingJob(tenantId);
    }

    // 200 = ack (Pub/Sub will not redeliver)
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    console.error('[Worker/ingest] Processing error', err);
    // Return 500 → Pub/Sub will retry (up to maxDeliveryAttempts, then DLQ)
    res.status(500).json({ success: false, error: 'Processing failed' });
  }
}

// ─── Trigger matching job ─────────────────────────────────────────────────────

async function triggerMatchingJob(tenantId: string): Promise<void> {
  try {
    const { PubSub } = await import('@google-cloud/pubsub');
    const pubsub = new PubSub();
    const topicName = process.env.PUBSUB_TOPIC_MATCHING || 'matching';
    const message = Buffer.from(
      JSON.stringify({ tenantId, triggeredBy: 'ingest', triggeredAt: new Date().toISOString() })
    );
    await pubsub.topic(topicName).publishMessage({ data: message });
    console.log(`[Worker/ingest] Triggered matching job for tenant ${tenantId}`);
  } catch (err) {
    // Non-fatal — matching can be triggered manually or on next ingest
    console.error('[Worker/ingest] Failed to trigger matching job', err);
  }
}
