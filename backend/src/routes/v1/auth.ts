/**
 * Authentication routes
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import admin from 'firebase-admin';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler, ValidationError } from '../../middleware/errorHandler.js';
import { query } from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// ============================================
// SCHEMAS
// ============================================

const SignupTenantSchema = z.object({
  companyName: z.string().min(2).max(100).trim(),
  firstName: z.string().min(1).max(50).trim().optional(),
  lastName: z.string().min(1).max(50).trim().optional(),
});

// ============================================
// ROUTES
// ============================================

/**
 * GET /auth/me - Get current user info
 */
router.get('/me', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { uid, email, tenantId, role } = req.user!;
  
  // Optionally fetch user details from database
  let userDetails = null;
  if (tenantId) {
    const result = await query(
      'SELECT id, first_name, last_name, role FROM users WHERE firebase_uid = $1',
      [uid]
    );
    if (result.rows.length > 0) {
      userDetails = result.rows[0];
    }
  }
  
  res.json({
    success: true,
    data: {
      uid,
      email,
      tenantId,
      role,
      ...userDetails,
    },
  });
}));

/**
 * POST /auth/signup-tenant - Create tenant and user after Firebase signup
 */
router.post('/signup-tenant', 
  requireAuth,
  validateBody(SignupTenantSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { uid, email } = req.user!;
    const { companyName, firstName, lastName } = req.body;

    // Check if user already has a tenant
    const existingUser = await query(
      'SELECT tenant_id FROM users WHERE firebase_uid = $1',
      [uid]
    );
    
    if (existingUser.rows.length > 0) {
      throw new ValidationError('User already belongs to a tenant');
    }

    // Create tenant
    const tenantId = uuidv4();
    await query(
      `INSERT INTO tenants (id, name, plan, status, created_at, updated_at) 
       VALUES ($1, $2, 'starter', 'active', NOW(), NOW())`,
      [tenantId, companyName]
    );

    // Create user
    const userId = uuidv4();
    await query(
      `INSERT INTO users (id, tenant_id, firebase_uid, email, first_name, last_name, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'admin', NOW(), NOW())`,
      [userId, tenantId, uid, email, firstName || null, lastName || null]
    );

    // Set Firebase custom claims
    await admin.auth().setCustomUserClaims(uid, {
      tenantId,
      role: 'admin',
    });

    console.log(`[Auth] New tenant created: ${tenantId} for user ${uid}`);

    res.status(201).json({
      success: true,
      data: {
        tenantId,
        userId,
        message: 'Tenant created successfully',
      },
    });
  })
);

/**
 * POST /auth/refresh-claims - Force refresh of Firebase custom claims
 */
router.post('/refresh-claims', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { uid } = req.user!;
  
  // Get user from database
  const result = await query(
    'SELECT tenant_id, role FROM users WHERE firebase_uid = $1',
    [uid]
  );
  
  if (result.rows.length === 0) {
    res.json({
      success: true,
      message: 'No tenant found for user',
    });
    return;
  }
  
  const { tenant_id, role } = result.rows[0];
  
  // Update Firebase custom claims
  await admin.auth().setCustomUserClaims(uid, {
    tenantId: tenant_id,
    role,
  });
  
  res.json({
    success: true,
    message: 'Claims refreshed. Please sign out and sign in again.',
  });
}));

export default router;
