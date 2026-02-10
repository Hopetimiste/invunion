/**
 * Invoices routes - v2
 * Updated with new fields: amount_excl_vat, amount_incl_vat, invoice_date, 
 * payment_expected_date, payment_method, external_reference, email_contact,
 * phone_contact, currency, recipient_name, recovery_percent
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

const ListInvoicesSchema = PaginationSchema.merge(DateRangeSchema).extend({
  status: InvoiceStatusEnum.optional(),
  type: InvoiceTypeEnum.optional(),
  supplierId: z.string().uuid().optional(),
  paymentMethod: PaymentMethodEnum.optional(),
  search: z.string().max(100).optional(),
  externalReference: z.string().max(255).optional(),
  minRecovery: z.coerce.number().min(0).max(100).optional(),
  maxRecovery: z.coerce.number().min(0).max(100).optional(),
  overdue: z.enum(['true', 'false']).optional(),
});

const CreateInvoiceSchema = z.object({
  // Source
  providerId: z.string().uuid().optional().nullable(),
  supplierId: z.string().uuid().optional().nullable(),
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
  
  // Metadata
  metadata: z.record(z.any()).optional().nullable(),
});

const UpdateInvoiceSchema = z.object({
  supplierId: z.string().uuid().optional().nullable(),
  externalReference: z.string().max(255).optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  paymentExpectedDate: z.coerce.date().optional().nullable(),
  paymentMethod: PaymentMethodEnum.optional().nullable(),
  recipientName: z.string().max(255).optional().nullable(),
  emailContact: z.string().email().max(255).optional().nullable(),
  phoneContact: z.string().max(50).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
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
      supplierId,
      paymentMethod,
      search, 
      externalReference,
      minRecovery,
      maxRecovery,
      overdue,
      startDate, 
      endDate 
    } = req.query as any;
    
    const offset = (page - 1) * pageSize;
    const params: any[] = [tenantId];
    let paramIndex = 2;
    
    let whereClause = 'WHERE tenant_id = $1';
    
    if (status) {
      whereClause += ` AND status = $${paramIndex++}`;
      params.push(status);
    }
    
    if (type) {
      whereClause += ` AND invoice_type = $${paramIndex++}`;
      params.push(type);
    }
    
    if (supplierId) {
      whereClause += ` AND supplier_id = $${paramIndex++}`;
      params.push(supplierId);
    }
    
    if (paymentMethod) {
      whereClause += ` AND payment_method = $${paramIndex++}`;
      params.push(paymentMethod);
    }
    
    if (externalReference) {
      whereClause += ` AND external_reference = $${paramIndex++}`;
      params.push(externalReference);
    }
    
    if (minRecovery !== undefined) {
      whereClause += ` AND recovery_percent >= $${paramIndex++}`;
      params.push(minRecovery);
    }
    
    if (maxRecovery !== undefined) {
      whereClause += ` AND recovery_percent <= $${paramIndex++}`;
      params.push(maxRecovery);
    }
    
    if (overdue === 'true') {
      whereClause += ` AND due_date < CURRENT_DATE AND status NOT IN ('paid', 'cancelled')`;
    }
    
    if (search) {
      whereClause += ` AND (
        invoice_number ILIKE $${paramIndex} OR 
        recipient_name ILIKE $${paramIndex} OR 
        customer_name ILIKE $${paramIndex} OR
        external_reference ILIKE $${paramIndex} OR
        description ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (startDate) {
      whereClause += ` AND invoice_date >= $${paramIndex++}`;
      params.push(startDate);
    }
    
    if (endDate) {
      whereClause += ` AND invoice_date <= $${paramIndex++}`;
      params.push(endDate);
    }
    
    // Allowed sort columns
    const allowedSortColumns = ['invoice_date', 'due_date', 'amount_incl_vat', 'recovery_percent', 'status', 'created_at'];
    const orderColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'invoice_date';
    const orderDir = sortOrder === 'asc' ? 'ASC' : 'DESC';
    
    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM invoices ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);
    
    // Get invoices with supplier info
    const result = await query<Invoice>(
      `SELECT i.*, s.name as supplier_name
       FROM invoices i
       LEFT JOIN suppliers s ON i.supplier_id = s.id
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
      SUM(amount_incl_vat) as total_amount,
      SUM(amount_incl_vat) FILTER (WHERE status = 'paid') as total_paid,
      SUM(amount_incl_vat * recovery_percent / 100) as total_recovered,
      SUM(amount_incl_vat) FILTER (WHERE status NOT IN ('paid', 'cancelled')) as total_outstanding,
      AVG(recovery_percent) as avg_recovery_percent,
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
    `SELECT i.*, s.name as supplier_name
     FROM invoices i
     LEFT JOIN suppliers s ON i.supplier_id = s.id
     WHERE i.id = $1 AND i.tenant_id = $2`,
    [id, tenantId]
  );
  
  if (result.rows.length === 0) {
    throw new NotFoundError('Invoice');
  }
  
  // Get associated matches with transaction details
  const matchesResult = await query(
    `SELECT m.*, 
            t.amount as transaction_amount, 
            t.transaction_date,
            t.description_display as transaction_description,
            t.counterparty_name
     FROM matches m
     LEFT JOIN transactions t ON m.transaction_id = t.id
     WHERE m.invoice_id = $1 AND m.status = 'active'
     ORDER BY m.created_at DESC`,
    [id]
  );
  
  // Calculate recovery details
  const totalMatched = matchesResult.rows.reduce((sum: number, m: any) => sum + (parseFloat(m.matched_amount) || 0), 0);
  const invoice = result.rows[0];
  
  res.json({
    success: true,
    data: {
      ...invoice,
      matches: matchesResult.rows,
      recovery: {
        percent: invoice.recovery_percent,
        totalMatched,
        remaining: (invoice.amount_incl_vat || 0) - totalMatched,
        matchCount: matchesResult.rows.length,
      },
    },
  });
}));

/**
 * GET /invoices/:id/recovery - Get detailed recovery information
 */
router.get('/:id/recovery', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;
  
  // Verify invoice exists
  const invoiceResult = await query(
    'SELECT id, amount_incl_vat, recovery_percent, status FROM invoices WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
  
  if (invoiceResult.rows.length === 0) {
    throw new NotFoundError('Invoice');
  }
  
  const invoice = invoiceResult.rows[0];
  
  // Get all matches for this invoice
  const matchesResult = await query(
    `SELECT m.id, m.matched_amount, m.match_type, m.confidence_score, m.created_at,
            t.id as transaction_id, t.amount as transaction_amount, 
            t.transaction_date, t.description_display, t.counterparty_name,
            t.payment_method, t.external_reference
     FROM matches m
     JOIN transactions t ON m.transaction_id = t.id
     WHERE m.invoice_id = $1 AND m.status = 'active'
     ORDER BY t.transaction_date DESC`,
    [id]
  );
  
  const totalMatched = matchesResult.rows.reduce((sum: number, m: any) => sum + parseFloat(m.matched_amount), 0);
  
  res.json({
    success: true,
    data: {
      invoiceId: id,
      invoiceAmount: invoice.amount_incl_vat,
      recoveryPercent: invoice.recovery_percent,
      status: invoice.status,
      totalMatched,
      remaining: invoice.amount_incl_vat - totalMatched,
      matches: matchesResult.rows,
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
        tenant_id, provider_id, supplier_id, source_type, source_id, source_raw,
        invoice_number, external_reference,
        invoice_date, due_date, payment_expected_date,
        amount_excl_vat, vat_amount, amount_incl_vat, currency,
        payment_method,
        recipient_name, customer_name, customer_email, email_contact, phone_contact,
        description, invoice_type, recovery_percent, status, metadata
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8,
        $9, $10, $11,
        $12, $13, $14, $15,
        $16,
        $17, $18, $19, $20, $21,
        $22, $23, 0, 'unpaid', $24
      )
      RETURNING *`,
      [
        tenantId,
        data.providerId || null,
        data.supplierId || null,
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
 * POST /invoices/bulk - Create multiple invoices
 */
router.post('/bulk',
  validateBody(z.object({ invoices: z.array(CreateInvoiceSchema).min(1).max(500) })),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { invoices } = req.body;
    
    let inserted = 0;
    let skipped = 0;
    const errors: any[] = [];
    
    for (const data of invoices) {
      try {
        await query(
          `INSERT INTO invoices (
            tenant_id, provider_id, supplier_id, source_type, source_id, source_raw,
            invoice_number, external_reference,
            invoice_date, due_date, payment_expected_date,
            amount_excl_vat, vat_amount, amount_incl_vat, currency,
            payment_method,
            recipient_name, customer_name, customer_email, email_contact, phone_contact,
            description, invoice_type, recovery_percent, status, metadata
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8,
            $9, $10, $11,
            $12, $13, $14, $15,
            $16,
            $17, $18, $19, $20, $21,
            $22, $23, 0, 'unpaid', $24
          )
          ON CONFLICT (tenant_id, source_type, source_id) DO NOTHING`,
          [
            tenantId,
            data.providerId || null,
            data.supplierId || null,
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
            data.metadata ? JSON.stringify(data.metadata) : '{}',
          ]
        );
        inserted++;
      } catch (err: any) {
        if (err.code === '23505') {
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
      { key: 'supplierId', column: 'supplier_id' },
      { key: 'externalReference', column: 'external_reference' },
      { key: 'dueDate', column: 'due_date' },
      { key: 'paymentExpectedDate', column: 'payment_expected_date' },
      { key: 'paymentMethod', column: 'payment_method' },
      { key: 'recipientName', column: 'recipient_name' },
      { key: 'emailContact', column: 'email_contact' },
      { key: 'phoneContact', column: 'phone_contact' },
      { key: 'description', column: 'description' },
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
  
  // Check if invoice has active matches
  const matchesResult = await query(
    "SELECT COUNT(*) FROM matches WHERE invoice_id = $1 AND status = 'active'",
    [id]
  );
  
  if (parseInt(matchesResult.rows[0].count, 10) > 0) {
    res.status(400).json({
      success: false,
      error: 'Cannot delete invoice with active matches. Cancel the matches first.',
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
