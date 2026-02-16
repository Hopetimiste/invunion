/**
 * Invoices routes - v4.1
 * Updated with v4.1 schema: kind (invoice/credit_note), origin_invoice_id,
 * counterparty_id, settled_amount, open_amount, accounting fields
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody, validateQuery, PaginationSchema, DateRangeSchema } from '../../middleware/validate.js';
import { asyncHandler, NotFoundError } from '../../middleware/errorHandler.js';
import { Invoice } from '../../types/index.js';
import { query } from '../../config/database.js';

const router = Router();

// Apply auth to all routes
router.use(requireAuth);

// ============================================
// SCHEMAS
// ============================================

const PaymentMethodEnum = z.enum(['card', 'transfer', 'direct_debit', 'cash', 'check', 'crypto', 'other']);
const InvoiceStatusEnum = z.enum(['unpaid', 'partial', 'paid', 'cancelled', 'overdue']);
const InvoiceTypeEnum = z.enum(['issued', 'received']);
const InvoiceKindEnum = z.enum(['invoice', 'credit_note']);

const ListInvoicesSchema = PaginationSchema.merge(DateRangeSchema).extend({
  status: InvoiceStatusEnum.optional(),
  type: InvoiceTypeEnum.optional(),
  kind: InvoiceKindEnum.optional(),
  counterpartyId: z.string().uuid().optional(),
  paymentMethod: PaymentMethodEnum.optional(),
  search: z.string().max(100).optional(),
  externalReference: z.string().max(255).optional(),
  minRecovery: z.coerce.number().min(0).max(100).optional(),
  maxRecovery: z.coerce.number().min(0).max(100).optional(),
  hasOpen: z.enum(['true', 'false']).optional(),  // open_amount > 0
  overdue: z.enum(['true', 'false']).optional(),
});

const CreateInvoiceSchema = z.object({
  // Source
  providerConnectionId: z.string().uuid().optional().nullable(),
  counterpartyId: z.string().uuid().optional().nullable(),
  originInvoiceId: z.string().uuid().optional().nullable(),  // v4.1 (for credit notes)
  kind: InvoiceKindEnum.default('invoice'),  // v4.1
  sourceType: z.string().min(1).max(50).default('manual'),
  sourceId: z.string().min(1).max(255),
  sourceRaw: z.record(z.any()).optional().nullable(),
  
  // Invoice identification
  invoiceNumber: z.string().max(100).optional().nullable(),
  externalReference: z.string().max(255).optional().nullable(),
  
  // Dates
  invoiceDate: z.coerce.date().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  paymentExpectedDate: z.coerce.date().optional().nullable(),
  
  // Amounts
  amountExclVat: z.number(),
  vatAmount: z.number().optional().nullable(),
  amountInclVat: z.number(),
  currency: z.string().length(3).default('EUR'),
  
  // Payment info
  paymentMethod: PaymentMethodEnum.optional().nullable(),
  
  // Contact info
  recipientName: z.string().max(255).optional().nullable(),
  customerName: z.string().max(255).optional().nullable(),
  customerEmail: z.string().email().max(255).optional().nullable(),
  emailContact: z.string().email().max(255).optional().nullable(),
  phoneContact: z.string().max(50).optional().nullable(),
  
  // Description
  description: z.string().max(1000).optional().nullable(),
  
  // Type
  invoiceType: InvoiceTypeEnum.default('issued'),
  
  // Accounting (v4.1)
  ledgerAccount: z.string().max(50).optional().nullable(),
  analytic1: z.string().max(100).optional().nullable(),
  analytic2: z.string().max(100).optional().nullable(),
  
  // Metadata
  metadata: z.record(z.any()).optional().nullable(),
});

const UpdateInvoiceSchema = z.object({
  counterpartyId: z.string().uuid().optional().nullable(),
  originInvoiceId: z.string().uuid().optional().nullable(),
  kind: InvoiceKindEnum.optional(),
  externalReference: z.string().max(255).optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  paymentExpectedDate: z.coerce.date().optional().nullable(),
  paymentMethod: PaymentMethodEnum.optional().nullable(),
  recipientName: z.string().max(255).optional().nullable(),
  emailContact: z.string().email().max(255).optional().nullable(),
  phoneContact: z.string().max(50).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  ledgerAccount: z.string().max(50).optional().nullable(),
  analytic1: z.string().max(100).optional().nullable(),
  analytic2: z.string().max(100).optional().nullable(),
  status: InvoiceStatusEnum.optional(),
  metadata: z.record(z.any()).optional().nullable(),
});

// ============================================
// ROUTES
// ============================================

/**
 * GET /invoices - List invoices with filters
 */
router.get('/', 
  validateQuery(ListInvoicesSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { 
      page = 1, 
      pageSize = 20, 
      sortBy = 'invoice_date', 
      sortOrder = 'desc',
      status,
      type,
      kind,
      counterpartyId,
      paymentMethod,
      search, 
      externalReference,
      minRecovery,
      maxRecovery,
      hasOpen,
      overdue,
      startDate, 
      endDate 
    } = req.query as any;
    
    const offset = (page - 1) * pageSize;
    const params: any[] = [tenantId];
    let paramIndex = 2;
    
    let whereClause = 'WHERE i.tenant_id = $1';
    
    if (status) {
      whereClause += ` AND i.status = $${paramIndex++}`;
      params.push(status);
    }
    
    if (type) {
      whereClause += ` AND i.invoice_type = $${paramIndex++}`;
      params.push(type);
    }
    
    if (kind) {
      whereClause += ` AND i.kind = $${paramIndex++}`;
      params.push(kind);
    }
    
    if (counterpartyId) {
      whereClause += ` AND i.counterparty_id = $${paramIndex++}`;
      params.push(counterpartyId);
    }
    
    if (paymentMethod) {
      whereClause += ` AND i.payment_method = $${paramIndex++}`;
      params.push(paymentMethod);
    }
    
    if (externalReference) {
      whereClause += ` AND i.external_reference = $${paramIndex++}`;
      params.push(externalReference);
    }
    
    if (minRecovery !== undefined) {
      whereClause += ` AND i.recovery_percent >= $${paramIndex++}`;
      params.push(minRecovery);
    }
    
    if (maxRecovery !== undefined) {
      whereClause += ` AND i.recovery_percent <= $${paramIndex++}`;
      params.push(maxRecovery);
    }
    
    if (hasOpen === 'true') {
      whereClause += ` AND i.open_amount > 0`;
    }
    
    if (overdue === 'true') {
      whereClause += ` AND i.due_date < CURRENT_DATE AND i.status NOT IN ('paid', 'cancelled')`;
    }
    
    if (search) {
      whereClause += ` AND (
        i.invoice_number ILIKE $${paramIndex} OR 
        i.recipient_name ILIKE $${paramIndex} OR 
        i.customer_name ILIKE $${paramIndex} OR
        i.external_reference ILIKE $${paramIndex} OR
        i.description ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (startDate) {
      whereClause += ` AND i.invoice_date >= $${paramIndex++}`;
      params.push(startDate);
    }
    
    if (endDate) {
      whereClause += ` AND i.invoice_date <= $${paramIndex++}`;
      params.push(endDate);
    }
    
    // Allowed sort columns
    const allowedSortColumns = ['invoice_date', 'due_date', 'amount_incl_vat', 'recovery_percent', 'settled_amount', 'open_amount', 'status', 'created_at'];
    const orderColumn = 'i.' + (allowedSortColumns.includes(sortBy) ? sortBy : 'invoice_date');
    const orderDir = sortOrder === 'asc' ? 'ASC' : 'DESC';
    
    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM invoices i ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);
    
    // Get invoices with counterparty info
    const result = await query<Invoice>(
      `SELECT i.*, 
        c.name as counterparty_name_display, 
        c.type as counterparty_type,
        c.category as counterparty_category,
        oi.invoice_number as origin_invoice_number
       FROM invoices i
       LEFT JOIN counterparties c ON i.counterparty_id = c.id
       LEFT JOIN invoices oi ON i.origin_invoice_id = oi.id
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
 * GET /invoices/stats - Get invoice statistics
 */
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  
  const result = await query(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'unpaid') as unpaid,
      COUNT(*) FILTER (WHERE status = 'partial') as partial,
      COUNT(*) FILTER (WHERE status = 'paid') as paid,
      COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
      COUNT(*) FILTER (WHERE status = 'overdue' OR (due_date < CURRENT_DATE AND status NOT IN ('paid', 'cancelled'))) as overdue,
      COUNT(*) FILTER (WHERE kind = 'invoice') as invoices_count,
      COUNT(*) FILTER (WHERE kind = 'credit_note') as credit_notes_count,
      SUM(amount_incl_vat) FILTER (WHERE kind = 'invoice') as total_amount,
      SUM(settled_amount) FILTER (WHERE kind = 'invoice') as total_settled,
      SUM(open_amount) FILTER (WHERE kind = 'invoice') as total_open,
      SUM(amount_incl_vat) FILTER (WHERE kind = 'invoice' AND status = 'paid') as total_paid,
      AVG(recovery_percent) FILTER (WHERE kind = 'invoice') as avg_recovery_percent,
      COUNT(*) FILTER (WHERE invoice_type = 'issued') as issued_count,
      COUNT(*) FILTER (WHERE invoice_type = 'received') as received_count
    FROM invoices 
    WHERE tenant_id = $1
  `, [tenantId]);
  
  res.json({
    success: true,
    data: result.rows[0],
  });
}));

/**
 * GET /invoices/:id - Get single invoice with recovery details
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;
  
  const result = await query<Invoice>(
    `SELECT i.*, 
      c.name as counterparty_name_display, 
      c.type as counterparty_type,
      oi.invoice_number as origin_invoice_number,
      oi.kind as origin_kind
     FROM invoices i
     LEFT JOIN counterparties c ON i.counterparty_id = c.id
     LEFT JOIN invoices oi ON i.origin_invoice_id = oi.id
     WHERE i.id = $1 AND i.tenant_id = $2`,
    [id, tenantId]
  );
  
  if (result.rows.length === 0) {
    throw new NotFoundError('Invoice');
  }
  
  const invoice = result.rows[0];
  
  // Get associated matches with transaction details
  const matchesResult = await query(
    `SELECT m.*, 
            t.amount as transaction_amount,
            t.direction,
            t.flow_type,
            t.transaction_date,
            t.description_display as transaction_description,
            t.counterparty_name
     FROM matches m
     LEFT JOIN transactions t ON m.transaction_id = t.id
     WHERE m.invoice_id = $1 AND m.status = 'active'
     ORDER BY m.created_at DESC`,
    [id]
  );
  
  // Get allocations if credit note
  let allocations = [];
  if (invoice.kind === 'credit_note') {
    const allocResult = await query(
      `SELECT ia.*,
        i.invoice_number as target_invoice_number,
        i.amount_incl_vat as target_amount
       FROM invoice_allocations ia
       JOIN invoices i ON ia.target_invoice_id = i.id
       WHERE ia.credit_invoice_id = $1 AND ia.status = 'active'
       ORDER BY ia.created_at DESC`,
      [id]
    );
    allocations = allocResult.rows;
  }
  
  // Get adjustments
  const adjustmentsResult = await query(
    `SELECT * FROM invoice_adjustments
     WHERE invoice_id = $1 AND status = 'active'
     ORDER BY created_at DESC`,
    [id]
  );
  
  res.json({
    success: true,
    data: {
      ...invoice,
      matches: matchesResult.rows,
      allocations,
      adjustments: adjustmentsResult.rows,
      recovery: {
        percent: invoice.recovery_percent,
        settled: invoice.settled_amount,
        open: invoice.open_amount,
        matchCount: matchesResult.rows.length,
      },
    },
  });
}));

/**
 * POST /invoices - Create invoice
 */
router.post('/',
  validateBody(CreateInvoiceSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const data = req.body;
    
    const result = await query<Invoice>(
      `INSERT INTO invoices (
        tenant_id, provider_connection_id, counterparty_id, origin_invoice_id, kind,
        source_type, source_id, source_raw,
        invoice_number, external_reference,
        invoice_date, due_date, payment_expected_date,
        amount_excl_vat, vat_amount, amount_incl_vat, currency,
        payment_method,
        recipient_name, customer_name, customer_email, email_contact, phone_contact,
        description, invoice_type,
        ledger_account, analytic_1, analytic_2,
        recovery_percent, status, metadata
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8,
        $9, $10,
        $11, $12, $13,
        $14, $15, $16, $17,
        $18,
        $19, $20, $21, $22, $23,
        $24, $25,
        $26, $27, $28,
        0, 'unpaid', $29
      )
      RETURNING *`,
      [
        tenantId,
        data.providerConnectionId || null,
        data.counterpartyId || null,
        data.originInvoiceId || null,
        data.kind,
        data.sourceType,
        data.sourceId,
        data.sourceRaw ? JSON.stringify(data.sourceRaw) : null,
        data.invoiceNumber || null,
        data.externalReference || null,
        data.invoiceDate || null,
        data.dueDate || null,
        data.paymentExpectedDate || null,
        data.amountExclVat,
        data.vatAmount || null,
        data.amountInclVat,
        data.currency,
        data.paymentMethod || null,
        data.recipientName || null,
        data.customerName || null,
        data.customerEmail || null,
        data.emailContact || null,
        data.phoneContact || null,
        data.description || null,
        data.invoiceType,
        data.ledgerAccount || null,
        data.analytic1 || null,
        data.analytic2 || null,
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
 * PUT /invoices/:id - Update invoice
 */
router.put('/:id',
  validateBody(UpdateInvoiceSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const updates = req.body;
    
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    const updateableFields = [
      { key: 'counterpartyId', column: 'counterparty_id' },
      { key: 'originInvoiceId', column: 'origin_invoice_id' },
      { key: 'kind', column: 'kind' },
      { key: 'externalReference', column: 'external_reference' },
      { key: 'dueDate', column: 'due_date' },
      { key: 'paymentExpectedDate', column: 'payment_expected_date' },
      { key: 'paymentMethod', column: 'payment_method' },
      { key: 'recipientName', column: 'recipient_name' },
      { key: 'emailContact', column: 'email_contact' },
      { key: 'phoneContact', column: 'phone_contact' },
      { key: 'description', column: 'description' },
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
      const result = await query<Invoice>(
        'SELECT * FROM invoices WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );
      if (result.rows.length === 0) {
        throw new NotFoundError('Invoice');
      }
      res.json({ success: true, data: result.rows[0] });
      return;
    }
    
    fields.push('updated_at = NOW()');
    values.push(id, tenantId);
    
    const result = await query<Invoice>(
      `UPDATE invoices SET ${fields.join(', ')} 
       WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}
       RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      throw new NotFoundError('Invoice');
    }
    
    res.json({
      success: true,
      data: result.rows[0],
    });
  })
);

/**
 * DELETE /invoices/:id - Delete invoice
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;
  
  // Check if invoice has active matches or allocations
  const activeResult = await query(
    `SELECT 
      (SELECT COUNT(*) FROM matches WHERE invoice_id = $1 AND status = 'active') as match_count,
      (SELECT COUNT(*) FROM invoice_allocations WHERE (credit_invoice_id = $1 OR target_invoice_id = $1) AND status = 'active') as allocation_count
    `,
    [id]
  );
  
  const { match_count, allocation_count } = activeResult.rows[0];
  
  if (parseInt(match_count, 10) > 0 || parseInt(allocation_count, 10) > 0) {
    res.status(400).json({
      success: false,
      error: 'Cannot delete invoice with active matches or allocations. Cancel them first.',
    });
    return;
  }
  
  const result = await query(
    'DELETE FROM invoices WHERE id = $1 AND tenant_id = $2 RETURNING id',
    [id, tenantId]
  );
  
  if (result.rows.length === 0) {
    throw new NotFoundError('Invoice');
  }
  
  res.json({
    success: true,
    message: 'Invoice deleted',
  });
}));

export default router;
