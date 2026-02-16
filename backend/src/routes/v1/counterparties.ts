import { Router } from 'express';
import { pool } from '../../config/database.js';
import { ApiResponse, Counterparty, ListParams, PaginatedResponse } from '../../types/index.js';

const router = Router();

/**
 * GET /api/v1/counterparties
 * List counterparties with filtering
 */
router.get('/', async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID required',
      });
    }

    const {
      page = 1,
      pageSize = 20,
      sortBy = 'name',
      sortOrder = 'asc',
      type,  // client, supplier, both
      status,
      search,
    } = req.query as ListParams;

    const offset = ((page as number) - 1) * (pageSize as number);

    // Build WHERE clause
    const conditions: string[] = ['tenant_id = $1'];
    const values: any[] = [tenantId];
    let paramIndex = 2;

    if (type) {
      conditions.push(`type = $${paramIndex++}`);
      values.push(type);
    }
    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (search) {
      conditions.push(`(name ILIKE $${paramIndex} OR legal_name ILIKE $${paramIndex} OR vat_number ILIKE $${paramIndex})`);
      values.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Count total
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM counterparties WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    // Fetch items
    values.push(pageSize, offset);
    const result = await pool.query(
      `SELECT * FROM counterparties
       WHERE ${whereClause}
       ORDER BY ${sortBy} ${sortOrder}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      values
    );

    const response: ApiResponse<PaginatedResponse<Counterparty>> = {
      success: true,
      data: {
        items: result.rows,
        total,
        page: page as number,
        pageSize: pageSize as number,
        hasMore: offset + result.rows.length < total,
      },
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error listing counterparties:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list counterparties',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/counterparties/:id
 * Get counterparty by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const result = await pool.query(
      'SELECT * FROM counterparties WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Counterparty not found',
      });
    }

    const response: ApiResponse<Counterparty> = {
      success: true,
      data: result.rows[0],
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error fetching counterparty:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch counterparty',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/counterparties/:id/invoices
 * Get all invoices for a counterparty
 */
router.get('/:id/invoices', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const result = await pool.query(
      `SELECT * FROM invoices 
       WHERE counterparty_id = $1 AND tenant_id = $2
       ORDER BY invoice_date DESC`,
      [id, tenantId]
    );

    const response: ApiResponse = {
      success: true,
      data: result.rows,
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error fetching counterparty invoices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch invoices',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/counterparties/:id/transactions
 * Get all transactions for a counterparty
 */
router.get('/:id/transactions', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const result = await pool.query(
      `SELECT * FROM transactions 
       WHERE counterparty_id = $1 AND tenant_id = $2
       ORDER BY transaction_date DESC`,
      [id, tenantId]
    );

    const response: ApiResponse = {
      success: true,
      data: result.rows,
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error fetching counterparty transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions',
      message: error.message,
    });
  }
});

/**
 * POST /api/v1/counterparties
 * Create new counterparty
 */
router.post('/', async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID required',
      });
    }

    const {
      type = 'supplier',
      name,
      legal_name,
      vat_number,
      category = 'professional',
      external_organization_id,
      external_entity_id,
      external_service_id,
      address,
      city,
      postal_code,
      country,
      emails = [],
      phone,
      external_reference,
      internal_reference,
      payment_terms_days = 30,
      iban,
      ledger_accounts = [],
      analytic_1,
      analytic_2,
      status = 'active',
      metadata = {},
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required',
      });
    }

    const result = await pool.query(
      `INSERT INTO counterparties (
        tenant_id, type, name, legal_name, vat_number, category,
        external_organization_id, external_entity_id, external_service_id,
        address, city, postal_code, country,
        emails, phone, external_reference, internal_reference,
        payment_terms_days, iban, ledger_accounts,
        analytic_1, analytic_2, status, metadata
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
      ) RETURNING *`,
      [
        tenantId, type, name, legal_name, vat_number, category,
        external_organization_id, external_entity_id, external_service_id,
        address, city, postal_code, country,
        JSON.stringify(emails), phone, external_reference, internal_reference,
        payment_terms_days, iban, JSON.stringify(ledger_accounts),
        analytic_1, analytic_2, status, metadata,
      ]
    );

    const response: ApiResponse<Counterparty> = {
      success: true,
      data: result.rows[0],
      message: 'Counterparty created successfully',
    };

    res.status(201).json(response);
  } catch (error: any) {
    console.error('Error creating counterparty:', error);

    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Counterparty with this name/VAT already exists',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create counterparty',
      message: error.message,
    });
  }
});

/**
 * PATCH /api/v1/counterparties/:id
 * Update counterparty
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Build dynamic UPDATE clause
    const updateableFields = [
      'type', 'name', 'legal_name', 'vat_number', 'category',
      'external_organization_id', 'external_entity_id', 'external_service_id',
      'address', 'city', 'postal_code', 'country',
      'emails', 'phone', 'external_reference', 'internal_reference',
      'payment_terms_days', 'iban', 'ledger_accounts',
      'analytic_1', 'analytic_2', 'status', 'metadata',
    ];

    for (const field of updateableFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${paramIndex++}`);
        // Convert arrays/objects to JSON strings
        if (['emails', 'ledger_accounts', 'metadata'].includes(field)) {
          values.push(JSON.stringify(req.body[field]));
        } else {
          values.push(req.body[field]);
        }
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update',
      });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id, tenantId);

    const result = await pool.query(
      `UPDATE counterparties
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Counterparty not found',
      });
    }

    const response: ApiResponse<Counterparty> = {
      success: true,
      data: result.rows[0],
      message: 'Counterparty updated successfully',
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error updating counterparty:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update counterparty',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/v1/counterparties/:id
 * Delete counterparty
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const result = await pool.query(
      'DELETE FROM counterparties WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Counterparty not found',
      });
    }

    const response: ApiResponse = {
      success: true,
      message: 'Counterparty deleted successfully',
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error deleting counterparty:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete counterparty',
      message: error.message,
    });
  }
});

export default router;
