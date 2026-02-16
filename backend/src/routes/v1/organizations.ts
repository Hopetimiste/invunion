import { Router } from 'express';
import { query } from '../../config/database.js';
import { ApiResponse, Organization, ListParams, PaginatedResponse } from '../../types/index.js';

const router = Router();

/**
 * GET /api/v1/organizations
 * List all organizations (superadmin only)
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, sortBy = 'created_at', sortOrder = 'desc' } = req.query as ListParams;
    const offset = ((page as number) - 1) * (pageSize as number);

    const countResult = await query('SELECT COUNT(*) FROM organizations');
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT * FROM organizations 
       ORDER BY ${sortBy} ${sortOrder}
       LIMIT $1 OFFSET $2`,
      [pageSize, offset]
    );

    const response: ApiResponse<PaginatedResponse<Organization>> = {
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
    console.error('Error listing organizations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list organizations',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/organizations/:id
 * Get organization by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM organizations WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found',
      });
    }

    const response: ApiResponse<Organization> = {
      success: true,
      data: result.rows[0],
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error fetching organization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch organization',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/organizations/:id/tenants
 * Get all tenants for an organization
 */
router.get('/:id/tenants', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT t.*, 
        (SELECT COUNT(*) FROM tenant_members tm WHERE tm.tenant_id = t.id) as member_count
       FROM tenants t
       WHERE t.organization_id = $1
       ORDER BY t.created_at DESC`,
      [id]
    );

    const response: ApiResponse = {
      success: true,
      data: result.rows,
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error fetching organization tenants:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tenants',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/organizations/:id/users
 * Get all users for an organization
 */
router.get('/:id/users', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT u.*,
        (SELECT json_agg(json_build_object(
          'tenant_id', tm.tenant_id,
          'tenant_name', t.name,
          'role', tm.role
        ))
        FROM tenant_members tm
        JOIN tenants t ON t.id = tm.tenant_id
        WHERE tm.user_id = u.id
        ) as tenant_memberships
       FROM users u
       WHERE u.organization_id = $1
       ORDER BY u.created_at DESC`,
      [id]
    );

    const response: ApiResponse = {
      success: true,
      data: result.rows,
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error fetching organization users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
      message: error.message,
    });
  }
});

/**
 * POST /api/v1/organizations
 * Create new organization
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      slug,
      plan = 'starter',
      billing_email,
      max_tenants = 3,
      max_users = 10,
      settings = {},
      status = 'active',
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required',
      });
    }

    // Generate slug if not provided
    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const result = await query(
      `INSERT INTO organizations (
        name, slug, plan, billing_email, max_tenants, max_users, settings, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [name, finalSlug, plan, billing_email, max_tenants, max_users, settings, status]
    );

    const response: ApiResponse<Organization> = {
      success: true,
      data: result.rows[0],
      message: 'Organization created successfully',
    };

    res.status(201).json(response);
  } catch (error: any) {
    console.error('Error creating organization:', error);
    
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({
        success: false,
        error: 'Organization with this slug already exists',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create organization',
      message: error.message,
    });
  }
});

/**
 * PATCH /api/v1/organizations/:id
 * Update organization
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      plan,
      billing_email,
      max_tenants,
      max_users,
      settings,
      status,
    } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (plan !== undefined) {
      updates.push(`plan = $${paramIndex++}`);
      values.push(plan);
    }
    if (billing_email !== undefined) {
      updates.push(`billing_email = $${paramIndex++}`);
      values.push(billing_email);
    }
    if (max_tenants !== undefined) {
      updates.push(`max_tenants = $${paramIndex++}`);
      values.push(max_tenants);
    }
    if (max_users !== undefined) {
      updates.push(`max_users = $${paramIndex++}`);
      values.push(max_users);
    }
    if (settings !== undefined) {
      updates.push(`settings = $${paramIndex++}`);
      values.push(settings);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update',
      });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE organizations 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found',
      });
    }

    const response: ApiResponse<Organization> = {
      success: true,
      data: result.rows[0],
      message: 'Organization updated successfully',
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error updating organization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update organization',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/v1/organizations/:id
 * Delete organization (cascade deletes tenants, users, etc.)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM organizations WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found',
      });
    }

    const response: ApiResponse = {
      success: true,
      message: 'Organization deleted successfully',
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error deleting organization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete organization',
      message: error.message,
    });
  }
});

export default router;
