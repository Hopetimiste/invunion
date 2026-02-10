/**
 * Suppliers routes
 * CRUD for suppliers/vendors (fournisseurs)
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody, validateQuery, PaginationSchema } from '../../middleware/validate.js';
import { asyncHandler, NotFoundError } from '../../middleware/errorHandler.js';
import { Supplier } from '../../types/index.js';
import { query } from '../../config/database.js';

const router = Router();

// Apply auth to all routes
router.use(requireAuth);

// ============================================
// SCHEMAS
// ============================================

const ListSuppliersSchema = PaginationSchema.extend({
  status: z.enum(['active', 'inactive']).optional(),
  search: z.string().max(100).optional(),
});

const CreateSupplierSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  taxId: z.string().max(100).optional().nullable(),
  iban: z.string().max(50).optional().nullable(),
  bic: z.string().max(11).optional().nullable(),
  paymentTermsDays: z.number().int().min(0).max(365).default(30),
  status: z.enum(['active', 'inactive']).default('active'),
  metadata: z.record(z.any()).optional().nullable(),
});

const UpdateSupplierSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().max(255).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  taxId: z.string().max(100).optional().nullable(),
  iban: z.string().max(50).optional().nullable(),
  bic: z.string().max(11).optional().nullable(),
  paymentTermsDays: z.number().int().min(0).max(365).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  metadata: z.record(z.any()).optional().nullable(),
});

// ============================================
// ROUTES
// ============================================

/**
 * GET /suppliers - List suppliers
 */
router.get('/', 
  validateQuery(ListSuppliersSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { 
      page = 1, 
      pageSize = 20, 
      sortBy = 'name', 
      sortOrder = 'asc',
      status,
      search
    } = req.query as any;
    
    const offset = (page - 1) * pageSize;
    const params: any[] = [tenantId];
    let paramIndex = 2;
    
    let whereClause = 'WHERE tenant_id = $1';
    
    if (status) {
      whereClause += ` AND status = $${paramIndex++}`;
      params.push(status);
    }
    
    if (search) {
      whereClause += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR tax_id ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    const allowedSortColumns = ['name', 'email', 'created_at', 'status'];
    const orderColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'name';
    const orderDir = sortOrder === 'desc' ? 'DESC' : 'ASC';
    
    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM suppliers ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);
    
    // Get suppliers with transaction/invoice counts
    const result = await query<Supplier>(
      `SELECT s.*,
              (SELECT COUNT(*) FROM transactions WHERE supplier_id = s.id) as transaction_count,
              (SELECT COUNT(*) FROM invoices WHERE supplier_id = s.id) as invoice_count
       FROM suppliers s
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
 * GET /suppliers/search - Quick search for autocomplete
 */
router.get('/search', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { q, limit = 10 } = req.query as any;
  
  if (!q || q.length < 2) {
    res.json({ success: true, data: [] });
    return;
  }
  
  const result = await query<Supplier>(
    `SELECT id, name, email, iban 
     FROM suppliers 
     WHERE tenant_id = $1 
       AND status = 'active'
       AND (name ILIKE $2 OR email ILIKE $2 OR iban ILIKE $2)
     ORDER BY name
     LIMIT $3`,
    [tenantId, `%${q}%`, Math.min(Number(limit), 50)]
  );
  
  res.json({
    success: true,
    data: result.rows,
  });
}));

/**
 * GET /suppliers/:id - Get single supplier with stats
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;
  
  const result = await query<Supplier>(
    'SELECT * FROM suppliers WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
  
  if (result.rows.length === 0) {
    throw new NotFoundError('Supplier');
  }
  
  // Get statistics
  const statsResult = await query(`
    SELECT 
      (SELECT COUNT(*) FROM transactions WHERE supplier_id = $1) as transaction_count,
      (SELECT SUM(ABS(amount)) FROM transactions WHERE supplier_id = $1) as total_transaction_amount,
      (SELECT COUNT(*) FROM invoices WHERE supplier_id = $1) as invoice_count,
      (SELECT SUM(amount_incl_vat) FROM invoices WHERE supplier_id = $1) as total_invoice_amount,
      (SELECT AVG(recovery_percent) FROM invoices WHERE supplier_id = $1) as avg_recovery_percent
  `, [id]);
  
  res.json({
    success: true,
    data: {
      ...result.rows[0],
      stats: statsResult.rows[0],
    },
  });
}));

/**
 * GET /suppliers/:id/transactions - Get supplier's transactions
 */
router.get('/:id/transactions', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;
  const { limit = 20 } = req.query as any;
  
  // Verify supplier exists
  const supplierResult = await query(
    'SELECT id FROM suppliers WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
  
  if (supplierResult.rows.length === 0) {
    throw new NotFoundError('Supplier');
  }
  
  const result = await query(
    `SELECT * FROM transactions 
     WHERE supplier_id = $1 AND tenant_id = $2
     ORDER BY transaction_date DESC
     LIMIT $3`,
    [id, tenantId, Math.min(Number(limit), 100)]
  );
  
  res.json({
    success: true,
    data: result.rows,
  });
}));

/**
 * GET /suppliers/:id/invoices - Get supplier's invoices
 */
router.get('/:id/invoices', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;
  const { limit = 20 } = req.query as any;
  
  // Verify supplier exists
  const supplierResult = await query(
    'SELECT id FROM suppliers WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
  
  if (supplierResult.rows.length === 0) {
    throw new NotFoundError('Supplier');
  }
  
  const result = await query(
    `SELECT * FROM invoices 
     WHERE supplier_id = $1 AND tenant_id = $2
     ORDER BY invoice_date DESC
     LIMIT $3`,
    [id, tenantId, Math.min(Number(limit), 100)]
  );
  
  res.json({
    success: true,
    data: result.rows,
  });
}));

/**
 * POST /suppliers - Create supplier
 */
router.post('/',
  validateBody(CreateSupplierSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const data = req.body;
    
    const result = await query<Supplier>(
      `INSERT INTO suppliers (
        tenant_id, name, email, phone, address, tax_id, iban, bic,
        payment_terms_days, status, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        tenantId,
        data.name,
        data.email || null,
        data.phone || null,
        data.address || null,
        data.taxId || null,
        data.iban || null,
        data.bic || null,
        data.paymentTermsDays,
        data.status,
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
 * PUT /suppliers/:id - Update supplier
 */
router.put('/:id',
  validateBody(UpdateSupplierSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const updates = req.body;
    
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    const updateableFields = [
      { key: 'name', column: 'name' },
      { key: 'email', column: 'email' },
      { key: 'phone', column: 'phone' },
      { key: 'address', column: 'address' },
      { key: 'taxId', column: 'tax_id' },
      { key: 'iban', column: 'iban' },
      { key: 'bic', column: 'bic' },
      { key: 'paymentTermsDays', column: 'payment_terms_days' },
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
      const result = await query<Supplier>(
        'SELECT * FROM suppliers WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );
      if (result.rows.length === 0) {
        throw new NotFoundError('Supplier');
      }
      res.json({ success: true, data: result.rows[0] });
      return;
    }
    
    fields.push('updated_at = NOW()');
    values.push(id, tenantId);
    
    const result = await query<Supplier>(
      `UPDATE suppliers SET ${fields.join(', ')} 
       WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}
       RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      throw new NotFoundError('Supplier');
    }
    
    res.json({
      success: true,
      data: result.rows[0],
    });
  })
);

/**
 * DELETE /suppliers/:id - Delete supplier (soft delete by setting inactive)
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;
  const { force } = req.query as any;
  
  // Check if supplier has transactions or invoices
  const usageResult = await query(`
    SELECT 
      (SELECT COUNT(*) FROM transactions WHERE supplier_id = $1) as transaction_count,
      (SELECT COUNT(*) FROM invoices WHERE supplier_id = $1) as invoice_count
  `, [id]);
  
  const { transaction_count, invoice_count } = usageResult.rows[0];
  
  if ((parseInt(transaction_count, 10) > 0 || parseInt(invoice_count, 10) > 0) && force !== 'true') {
    // Soft delete - just mark as inactive
    const result = await query<Supplier>(
      `UPDATE suppliers SET status = 'inactive', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [id, tenantId]
    );
    
    if (result.rows.length === 0) {
      throw new NotFoundError('Supplier');
    }
    
    res.json({
      success: true,
      message: 'Supplier deactivated (has associated transactions/invoices)',
      data: result.rows[0],
    });
    return;
  }
  
  // Hard delete
  const result = await query(
    'DELETE FROM suppliers WHERE id = $1 AND tenant_id = $2 RETURNING id',
    [id, tenantId]
  );
  
  if (result.rows.length === 0) {
    throw new NotFoundError('Supplier');
  }
  
  res.json({
    success: true,
    message: 'Supplier deleted',
  });
}));

export default router;
