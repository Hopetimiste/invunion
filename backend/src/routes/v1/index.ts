/**
 * API v1 Routes - Main router
 * Version: 4.1.0
 */

import { Router } from 'express';
import healthRoutes from './health.js';
import authRoutes from './auth.js';
import transactionsRoutes from './transactions.js';
import invoicesRoutes from './invoices.js';
import counterpartiesRoutes from './counterparties.js';  // v4.1 (replaces suppliers)
import matchesRoutes from './matches.js';
import ingestRoutes from './ingest.js';
import connectionsRoutes from './connections.js';
import adminRoutes from './admin.js';
import bankingRoutes from './banking.js';
import organizationsRoutes from './organizations.js';  // v4.1 NEW
import tenantMembersRoutes from './tenant-members.js';  // v4.1 NEW

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

    // Check if user already exists
    const existingUser = await query(
      'SELECT id, organization_id FROM users WHERE firebase_uid = $1',
      [uid]
    );
    
    if (existingUser.rows.length > 0) {
      throw new ValidationError('User already exists');
    }

    // v4.1: Create Organization → Tenant → User → TenantMember
    const organizationId = uuidv4();
    const tenantId = uuidv4();
    const userId = uuidv4();

    // Generate slug from company name
    const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // 1. Create organization
    await query(
      `INSERT INTO organizations (id, name, slug, plan, max_tenants, max_users, status, created_at, updated_at) 
       VALUES ($1, $2, $3, 'starter', 3, 10, 'active', NOW(), NOW())`,
      [organizationId, companyName, slug]
    );

    // 2. Create tenant
    await query(
      `INSERT INTO tenants (id, organization_id, name, legal_name, plan, status, metadata, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, 'starter', 'active', '{}', NOW(), NOW())`,
      [tenantId, organizationId, companyName, companyName]
    );

    // 3. Create user (owner at org level)
    await query(
      `INSERT INTO users (id, organization_id, firebase_uid, email, first_name, last_name, org_role, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'owner', '{}', NOW(), NOW())`,
      [userId, organizationId, uid, email, firstName || null, lastName || null]
    );

    // 4. Add user to tenant as admin
    await query(
      `INSERT INTO tenant_members (tenant_id, user_id, role, created_at)
       VALUES ($1, $2, 'admin', NOW())`,
      [tenantId, userId]
    );

    // Set Firebase custom claims
    await admin.auth().setCustomUserClaims(uid, {
      organizationId,
      tenantId,
      role: 'admin',
    });

    console.log(`[Auth] New organization + tenant created: ${organizationId} / ${tenantId} for user ${uid}`);

    res.status(201).json({
      success: true,
      data: {
        organizationId,
        tenantId,
        userId,
        message: 'Organization and tenant created successfully',
      },
    });
  })
);

// Protected routes (require authentication)
router.use('/organizations', organizationsRoutes);  // v4.1 NEW
router.use('/tenant-members', tenantMembersRoutes);  // v4.1 NEW
router.use('/counterparties', counterpartiesRoutes);  // v4.1 (replaces /suppliers)
router.use('/transactions', transactionsRoutes);
router.use('/invoices', invoicesRoutes);
router.use('/matches', matchesRoutes);
router.use('/ingest', ingestRoutes);
router.use('/connections', connectionsRoutes);
router.use('/banking', bankingRoutes);

// Admin routes
router.use('/admin', adminRoutes);

export default router;
