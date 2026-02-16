import { Router } from 'express';
import { query } from '../../config/database.js';
import { ApiResponse, TenantMember } from '../../types/index.js';

const router = Router();

/**
 * GET /api/v1/tenant-members
 * List all members for current tenant
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

    const result = await query(
      `SELECT tm.*,
        u.email, u.first_name, u.last_name, u.org_role
       FROM tenant_members tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.tenant_id = $1
       ORDER BY tm.created_at DESC`,
      [tenantId]
    );

    const response: ApiResponse = {
      success: true,
      data: result.rows,
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error listing tenant members:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list members',
      message: error.message,
    });
  }
});

/**
 * POST /api/v1/tenant-members
 * Add user to tenant
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

    const { user_id, role = 'viewer' } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
    }

    // Check if user exists and belongs to same organization
    const userCheck = await query(
      `SELECT u.id, u.organization_id, t.organization_id as tenant_org_id
       FROM users u
       CROSS JOIN tenants t
       WHERE u.id = $1 AND t.id = $2`,
      [user_id, tenantId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    if (userCheck.rows[0].organization_id !== userCheck.rows[0].tenant_org_id) {
      return res.status(403).json({
        success: false,
        error: 'User does not belong to the same organization',
      });
    }

    const result = await query(
      `INSERT INTO tenant_members (tenant_id, user_id, role)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [tenantId, user_id, role]
    );

    const response: ApiResponse<TenantMember> = {
      success: true,
      data: result.rows[0],
      message: 'Member added successfully',
    };

    res.status(201).json(response);
  } catch (error: any) {
    console.error('Error adding tenant member:', error);

    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'User is already a member of this tenant',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to add member',
      message: error.message,
    });
  }
});

/**
 * PATCH /api/v1/tenant-members/:id
 * Update member role
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({
        success: false,
        error: 'Role is required',
      });
    }

    const result = await query(
      `UPDATE tenant_members
       SET role = $1
       WHERE id = $2 AND tenant_id = $3
       RETURNING *`,
      [role, id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Member not found',
      });
    }

    const response: ApiResponse<TenantMember> = {
      success: true,
      data: result.rows[0],
      message: 'Member role updated successfully',
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error updating tenant member:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update member',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/v1/tenant-members/:id
 * Remove user from tenant
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const result = await query(
      'DELETE FROM tenant_members WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Member not found',
      });
    }

    const response: ApiResponse = {
      success: true,
      message: 'Member removed successfully',
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error removing tenant member:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove member',
      message: error.message,
    });
  }
});

export default router;
