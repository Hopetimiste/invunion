/**
 * API v1 Routes - Main router
 */

import { Router } from 'express';
import healthRoutes from './health.js';
import authRoutes from './auth.js';
import transactionsRoutes from './transactions.js';
import invoicesRoutes from './invoices.js';
import suppliersRoutes from './suppliers.js';
import matchesRoutes from './matches.js';
import alertsRoutes from './alerts.js';
import reportsRoutes from './reports.js';
import ingestRoutes from './ingest.js';
import connectionsRoutes from './connections.js';
import adminRoutes from './admin.js';
import bankingRoutes from './banking.js';

const router = Router();

// Public routes
router.use('/', healthRoutes);

// Auth routes
router.use('/auth', authRoutes);

// Alias for signup-tenant (for frontend compatibility)
// Redirects POST /signup-tenant to /auth/signup-tenant
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler, ValidationError } from '../../middleware/errorHandler.js';
import { query } from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import admin from 'firebase-admin';
import { Request, Response } from 'express';

const SignupTenantSchema = z.object({
  companyName: z.string().min(2).max(100).trim(),
  firstName: z.string().min(1).max(50).trim().optional(),
  lastName: z.string().min(1).max(50).trim().optional(),
});

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
      `INSERT INTO tenants (id, name, plan, status, metadata, created_at, updated_at) 
       VALUES ($1, $2, 'starter', 'active', '{}', NOW(), NOW())`,
      [tenantId, companyName]
    );

    // Create user
    const userId = uuidv4();
    await query(
      `INSERT INTO users (id, tenant_id, firebase_uid, email, first_name, last_name, role, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'admin', '{}', NOW(), NOW())`,
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

// Protected routes (require authentication)
router.use('/transactions', transactionsRoutes);
router.use('/invoices', invoicesRoutes);
router.use('/suppliers', suppliersRoutes);
router.use('/matches', matchesRoutes);
router.use('/alerts', alertsRoutes);
router.use('/reports', reportsRoutes);
router.use('/ingest', ingestRoutes);
router.use('/connections', connectionsRoutes);
router.use('/banking', bankingRoutes);

// Admin routes
router.use('/admin', adminRoutes);

export default router;
