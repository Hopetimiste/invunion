/**
 * Transactions routes - v4.1
 * Updated with v4.1 schema: direction, flow_type, counterparty_id,
 * allocated_amount, remaining_amount, accounting fields
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody, validateQuery, PaginationSchema, DateRangeSchema } from '../../middleware/validate.js';
import { asyncHandler, NotFoundError } from '../../middleware/errorHandler.js';
import { Transaction } from '../../types/index.js';
import { query } from '../../config/database.js';

const router = Router();

// Apply auth to all routes
router.use(requireAuth);

// ============================================
// SCHEMAS
// ============================================

const DirectionEnum = z.enum(['in', 'out']);
const FlowTypeEnum = z.enum(['payment', 'refund', 'fee', 'chargeback', 'payout', 'direct_debit', 'transfer', 'adjustment', 'other']);
const PaymentMethodEnum = z.enum(['card', 'transfer', 'direct_debit', 'cash', 'check', 'crypto', 'other']);
const PaymentContextEnum = z.enum(['CIT', 'MIT', 'recurring', 'one_time', 'refund', 'other']);
const TransactionStatusEnum = z.enum(['unconsidered', 'unmatched', 'matched', 'ignored', 'pending']);

const ListTransactionsSchema = PaginationSchema.merge(DateRangeSchema).extend({
  status: TransactionStatusEnum.optional(),
  direction: DirectionEnum.optional(),
  flowType: FlowTypeEnum.optional(),
  accountId: z.string().uuid().optional(),
  counterpartyId: z.string().uuid().optional(),
  paymentMethod: PaymentMethodEnum.optional(),
  paymentContext: PaymentContextEnum.optional(),
  search: z.string().max(100).optional(),
  externalReference: z.string().max(255).optional(),
  hasRemaining: z.enum(['true', 'false']).optional(),  // Filter by remaining_amount > 0
});

const CreateTransactionSchema = z.object({
  // Source
  accountId: z.string().uuid().optional().nullable(),
  counterpartyId: z.string().uuid().optional().nullable(),
  sourceType: z.enum(['tink', 'gocardless', 'salt_edge', 'plaid', 'csv', 'api', 'manual', 'n8n']).default('api'),
  sourceId: z.string().min(1).max(255),
  sourceRaw: z.record(z.any()).optional().nullable(),
  
  // Amount (v4.1 - always positive + direction)
  amount: z.number().positive(),
  direction: DirectionEnum,
  flowType: FlowTypeEnum.default('payment'),
  currency: z.string().length(3).default('EUR'),
  
  // Dates
  transactionDate: z.coerce.date(),
  bookingDate: z.coerce.date().optional().nullable(),
  valueDate: z.coerce.date().optional().nullable(),
  
  // Payment info
  paymentMethod: PaymentMethodEnum.optional().nullable(),
  paymentContext: PaymentContextEnum.optional().nullable(),
  externalReference: z.string().max(255).optional().nullable(),
  
  // Remittance (v4.1)
  remittanceInfo: z.string().max(500).optional().nullable(),
  structuredReference: z.string().max(255).optional().nullable(),
  
  // Descriptions
  descriptionOriginal: z.string().max(1000).optional().nullable(),
  descriptionDisplay: z.string().max(1000).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  
  // Counterparty
  counterpartyName: z.string().max(255).optional().nullable(),
  counterpartyIban: z.string().max(50).optional().nullable(),
  counterpartyBic: z.string().max(11).optional().nullable(),
  
  // Accounting (v4.1)
  ledgerAccount: z.string().max(50).optional().nullable(),
  analytic1: z.string().max(100).optional().nullable(),
  analytic2: z.string().max(100).optional().nullable(),
  
  // Status
  status: TransactionStatusEnum.default('unconsidered'),
  
  // Metadata
  metadata: z.record(z.any()).optional().nullable(),
});

const UpdateTransactionSchema = z.object({
  // Modifiable fields
  counterpartyId: z.string().uuid().optional().nullable(),
  direction: DirectionEnum.optional(),
  flowType: FlowTypeEnum.optional(),
  paymentMethod: PaymentMethodEnum.optional().nullable(),
  paymentContext: PaymentContextEnum.optional().nullable(),
  externalReference: z.string().max(255).optional().nullable(),
  remittanceInfo: z.string().max(500).optional().nullable(),
  structuredReference: z.string().max(255).optional().nullable(),
  descriptionDisplay: z.string().max(1000).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  ledgerAccount: z.string().max(50).optional().nullable(),
  analytic1: z.string().max(100).optional().nullable(),
  analytic2: z.string().max(100).optional().nullable(),
  status: TransactionStatusEnum.optional(),
  metadata: z.record(z.any()).optional().nullable(),
});

const BulkUpdateSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  status: TransactionStatusEnum.optional(),
  counterpartyId: z.string().uuid().optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  ledgerAccount: z.string().max(50).optional().nullable(),
});

// ============================================
// ROUTES
// ============================================

/**
 * GET /transactions - List transactions with filters
 */
router.get('/', 
  validateQuery(ListTransactionsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { 
      page = 1, 
      pageSize = 20, 
      sortBy = 'transaction_date', 
      sortOrder = 'desc',
      status,
      direction,
      flowType,
      accountId, 
      counterpartyId,
      paymentMethod,
      paymentContext,
      search, 
      externalReference,
      startDate, 
      endDate,
      hasRemaining,
    } = req.query as any;
    
    const offset = (page - 1) * pageSize;
    const params: any[] = [tenantId];
    let paramIndex = 2;
    
    let whereClause = 'WHERE t.tenant_id = $1';
    
    if (status) {
      whereClause += ` AND t.status = $${paramIndex++}`;
      params.push(status);
    }
    
    if (direction) {
      whereClause += ` AND t.direction = $${paramIndex++}`;
      params.push(direction);
    }
    
    if (flowType) {
      whereClause += ` AND t.flow_type = $${paramIndex++}`;
      params.push(flowType);
    }
    
    if (accountId) {
      whereClause += ` AND t.account_id = $${paramIndex++}`;
      params.push(accountId);
    }
    
    if (counterpartyId) {
      whereClause += ` AND t.counterparty_id = $${paramIndex++}`;
      params.push(counterpartyId);
    }
    
    if (paymentMethod) {
      whereClause += ` AND t.payment_method = $${paramIndex++}`;
      params.push(paymentMethod);
    }
    
    if (paymentContext) {
      whereClause += ` AND t.payment_context = $${paramIndex++}`;
      params.push(paymentContext);
    }
    
    if (externalReference) {
      whereClause += ` AND t.external_reference = $${paramIndex++}`;
      params.push(externalReference);
    }
    
    if (hasRemaining === 'true') {
      whereClause += ` AND t.remaining_amount > 0`;
    }
    
    if (search) {
      whereClause += ` AND (
        t.description_display ILIKE $${paramIndex} OR 
        t.description_original ILIKE $${paramIndex} OR 
        t.counterparty_name ILIKE $${paramIndex} OR
        t.counterparty_name_normalized ILIKE $${paramIndex} OR
        t.external_reference ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (startDate) {
      whereClause += ` AND t.transaction_date >= $${paramIndex++}`;
      params.push(startDate);
    }
    
    if (endDate) {
      whereClause += ` AND t.transaction_date <= $${paramIndex++}`;
      params.push(endDate);
    }
    
    // Allowed sort columns
    const allowedSortColumns = ['transaction_date', 'amount', 'added_at', 'booking_date', 'status', 'remaining_amount'];
    const orderColumn = 't.' + (allowedSortColumns.includes(sortBy) ? sortBy : 'transaction_date');
    const orderDir = sortOrder === 'asc' ? 'ASC' : 'DESC';
    
    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM transactions t ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);
    
    // Get transactions with counterparty info
    const result = await query<Transaction>(
      `SELECT t.*, c.name as counterparty_name_display, c.type as counterparty_type
       FROM transactions t
       LEFT JOIN counterparties c ON t.counterparty_id = c.id
       ${whereClause} 
       ORDER BY ${orderColumn} ${orderDir} 
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, pageSize, offset]
    );
    
    res.json({
      success: true,
      data: {
        items: result.rows,
        total,
        page: Number(page),
        pageSize: Number(pageSize),
        hasMore: offset + result.rows.length < total,
      },
    });
  })
);

/**
 * GET /transactions/stats - Get transaction statistics
 */
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  
  const result = await query(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'unconsidered') as unconsidered,
      COUNT(*) FILTER (WHERE status = 'unmatched') as unmatched,
      COUNT(*) FILTER (WHERE status = 'matched') as matched,
      COUNT(*) FILTER (WHERE status = 'ignored') as ignored,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE direction = 'in') as total_in,
      COUNT(*) FILTER (WHERE direction = 'out') as total_out,
      SUM(CASE WHEN direction = 'in' THEN amount ELSE 0 END) as sum_in,
      SUM(CASE WHEN direction = 'out' THEN amount ELSE 0 END) as sum_out,
      SUM(remaining_amount) as total_remaining,
      COUNT(*) FILTER (WHERE remaining_amount > 0) as with_remaining,
      COUNT(DISTINCT payment_method) as payment_methods_count,
      COUNT(DISTINCT counterparty_id) as counterparties_count
    FROM transactions 
    WHERE tenant_id = $1
  `, [tenantId]);
  
  res.json({
    success: true,
    data: result.rows[0],
  });
}));

/**
 * GET /transactions/:id - Get single transaction
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;
  
  const result = await query<Transaction>(
    `SELECT t.*, 
      c.name as counterparty_name_display, 
      c.type as counterparty_type,
      c.category as counterparty_category
     FROM transactions t
     LEFT JOIN counterparties c ON t.counterparty_id = c.id
     WHERE t.id = $1 AND t.tenant_id = $2`,
    [id, tenantId]
  );
  
  if (result.rows.length === 0) {
    throw new NotFoundError('Transaction');
  }
  
  // Get associated matches
  const matchesResult = await query(
    `SELECT m.*, i.invoice_number, i.amount_incl_vat as invoice_amount, i.kind as invoice_kind
     FROM matches m
     LEFT JOIN invoices i ON m.invoice_id = i.id
     WHERE m.transaction_id = $1 AND m.status = 'active'`,
    [id]
  );
  
  res.json({
    success: true,
    data: {
      ...result.rows[0],
      matches: matchesResult.rows,
    },
  });
}));

/**
 * POST /transactions - Create transaction
 */
router.post('/',
  validateBody(CreateTransactionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const data = req.body;
    
    // Normalize counterparty name if provided
    let normalizedName = null;
    if (data.counterpartyName) {
      normalizedName = data.counterpartyName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9àâäéèêëïîôùûüÿç\s]/gi, '')
        .replace(/\s+/g, ' ');
    }
    
    const result = await query<Transaction>(
      `INSERT INTO transactions (
        tenant_id, account_id, counterparty_id, 
        source_type, source_id, source_raw,
        amount, direction, flow_type, currency, 
        transaction_date, booking_date, value_date,
        payment_method, payment_context, external_reference,
        remittance_info, structured_reference,
        description_original, description_display, category,
        counterparty_name, counterparty_name_normalized, 
        counterparty_iban, counterparty_bic,
        ledger_account, analytic_1, analytic_2,
        status, metadata
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25,
        $26, $27, $28, $29, $30
      )
      RETURNING *`,
      [
        tenantId, 
        data.accountId || null, 
        data.counterpartyId || null,
        data.sourceType, 
        data.sourceId, 
        data.sourceRaw ? JSON.stringify(data.sourceRaw) : null,
        data.amount,
        data.direction,
        data.flowType || 'payment',
        data.currency,
        data.transactionDate, 
        data.bookingDate || null, 
        data.valueDate || null,
        data.paymentMethod || null, 
        data.paymentContext || null, 
        data.externalReference || null,
        data.remittanceInfo || null,
        data.structuredReference || null,
        data.descriptionOriginal || null, 
        data.descriptionDisplay || data.descriptionOriginal || null, 
        data.category || null,
        data.counterpartyName || null,
        normalizedName,
        data.counterpartyIban || null, 
        data.counterpartyBic || null,
        data.ledgerAccount || null,
        data.analytic1 || null,
        data.analytic2 || null,
        data.status || 'unconsidered',
        data.metadata ? JSON.stringify(data.metadata) : '{}',
      ]
    );
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  })
);

/**
 * POST /transactions/bulk - Create multiple transactions
 */
router.post('/bulk',
  validateBody(z.object({ transactions: z.array(CreateTransactionSchema).min(1).max(1000) })),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { transactions } = req.body;
    
    let inserted = 0;
    let skipped = 0;
    const errors: any[] = [];
    
    for (const data of transactions) {
      try {
        let normalizedName = null;
        if (data.counterpartyName) {
          normalizedName = data.counterpartyName
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9àâäéèêëïîôùûüÿç\s]/gi, '')
            .replace(/\s+/g, ' ');
        }

        await query(
          `INSERT INTO transactions (
            tenant_id, account_id, counterparty_id, 
            source_type, source_id, source_raw,
            amount, direction, flow_type, currency, 
            transaction_date, booking_date, value_date,
            payment_method, payment_context, external_reference,
            remittance_info, structured_reference,
            description_original, description_display, category,
            counterparty_name, counterparty_name_normalized, 
            counterparty_iban, counterparty_bic,
            ledger_account, analytic_1, analytic_2,
            status, metadata
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
            $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25,
            $26, $27, $28, $29, $30
          )
          ON CONFLICT (tenant_id, source_type, source_id) DO NOTHING`,
          [
            tenantId, 
            data.accountId || null, 
            data.counterpartyId || null,
            data.sourceType, 
            data.sourceId, 
            data.sourceRaw ? JSON.stringify(data.sourceRaw) : null,
            data.amount,
            data.direction,
            data.flowType || 'payment',
            data.currency,
            data.transactionDate, 
            data.bookingDate || null, 
            data.valueDate || null,
            data.paymentMethod || null, 
            data.paymentContext || null, 
            data.externalReference || null,
            data.remittanceInfo || null,
            data.structuredReference || null,
            data.descriptionOriginal || null, 
            data.descriptionDisplay || data.descriptionOriginal || null, 
            data.category || null,
            data.counterpartyName || null,
            normalizedName,
            data.counterpartyIban || null, 
            data.counterpartyBic || null,
            data.ledgerAccount || null,
            data.analytic1 || null,
            data.analytic2 || null,
            data.status || 'unconsidered',
            data.metadata ? JSON.stringify(data.metadata) : '{}',
          ]
        );
        inserted++;
      } catch (err: any) {
        if (err.code === '23505') { // Unique violation
          skipped++;
        } else {
          errors.push({ sourceId: data.sourceId, error: err.message });
        }
      }
    }
    
    res.status(201).json({
      success: true,
      data: {
        inserted,
        skipped,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  })
);

/**
 * PUT /transactions/:id - Update transaction
 */
router.put('/:id',
  validateBody(UpdateTransactionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const updates = req.body;
    
    // Build dynamic update query
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    const updateableFields = [
      { key: 'counterpartyId', column: 'counterparty_id' },
      { key: 'direction', column: 'direction' },
      { key: 'flowType', column: 'flow_type' },
      { key: 'paymentMethod', column: 'payment_method' },
      { key: 'paymentContext', column: 'payment_context' },
      { key: 'externalReference', column: 'external_reference' },
      { key: 'remittanceInfo', column: 'remittance_info' },
      { key: 'structuredReference', column: 'structured_reference' },
      { key: 'descriptionDisplay', column: 'description_display' },
      { key: 'category', column: 'category' },
      { key: 'ledgerAccount', column: 'ledger_account' },
      { key: 'analytic1', column: 'analytic_1' },
      { key: 'analytic2', column: 'analytic_2' },
      { key: 'status', column: 'status' },
      { key: 'metadata', column: 'metadata' },
    ];
    
    for (const { key, column } of updateableFields) {
      if (updates[key] !== undefined) {
        fields.push(`${column} = $${paramIndex++}`);
        values.push(key === 'metadata' ? JSON.stringify(updates[key]) : updates[key]);
      }
    }
    
    if (fields.length === 0) {
      const result = await query<Transaction>(
        'SELECT * FROM transactions WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );
      if (result.rows.length === 0) {
        throw new NotFoundError('Transaction');
      }
      res.json({ success: true, data: result.rows[0] });
      return;
    }
    
    fields.push('updated_at = NOW()');
    values.push(id, tenantId);
    
    const result = await query<Transaction>(
      `UPDATE transactions SET ${fields.join(', ')} 
       WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}
       RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      throw new NotFoundError('Transaction');
    }
    
    res.json({
      success: true,
      data: result.rows[0],
    });
  })
);

/**
 * PUT /transactions/bulk - Bulk update transactions
 */
router.put('/bulk',
  validateBody(BulkUpdateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { ids, status, counterpartyId, category, ledgerAccount } = req.body;
    
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (counterpartyId !== undefined) {
      fields.push(`counterparty_id = $${paramIndex++}`);
      values.push(counterpartyId);
    }
    if (category !== undefined) {
      fields.push(`category = $${paramIndex++}`);
      values.push(category);
    }
    if (ledgerAccount !== undefined) {
      fields.push(`ledger_account = $${paramIndex++}`);
      values.push(ledgerAccount);
    }
    
    if (fields.length === 0) {
      res.json({ success: true, data: { updated: 0 } });
      return;
    }
    
    fields.push('updated_at = NOW()');
    values.push(tenantId);
    values.push(ids);
    
    const result = await query(
      `UPDATE transactions SET ${fields.join(', ')} 
       WHERE tenant_id = $${paramIndex++} AND id = ANY($${paramIndex})
       RETURNING id`,
      values
    );
    
    res.json({
      success: true,
      data: { updated: result.rowCount },
    });
  })
);

/**
 * DELETE /transactions/:id - Delete transaction
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;
  
  const result = await query(
    'DELETE FROM transactions WHERE id = $1 AND tenant_id = $2 RETURNING id',
    [id, tenantId]
  );
  
  if (result.rows.length === 0) {
    throw new NotFoundError('Transaction');
  }
  
  res.json({
    success: true,
    message: 'Transaction deleted',
  });
}));

export default router;
