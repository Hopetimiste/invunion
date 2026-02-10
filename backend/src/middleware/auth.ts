/**
 * Authentication Middleware
 */

import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import { AuthUser } from '../types/index.js';
import { config } from '../config/index.js';

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: config.firebase.projectId,
  });
  console.log('[Auth] Firebase Admin initialized');
}

/**
 * Require authentication via Firebase ID token
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const header = req.headers.authorization || '';
    const match = header.match(/^Bearer (.+)$/);
    
    if (!match) {
      res.status(401).json({ 
        success: false, 
        error: 'Missing Bearer token' 
      });
      return;
    }

    const decoded = await admin.auth().verifyIdToken(match[1]);

    req.user = {
      uid: decoded.uid,
      email: decoded.email || null,
      tenantId: decoded.tenantId || null,
      role: decoded.role || 'user',
      claims: decoded,
    } as AuthUser;

    next();
  } catch (err: any) {
    console.error('[Auth] Token verification failed:', err.message);
    res.status(401).json({
      success: false,
      error: 'Invalid token',
      message: config.nodeEnv === 'development' ? err.message : undefined,
    });
  }
}

/**
 * Require admin role (platform admin or tenant admin)
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ 
      success: false, 
      error: 'Not authenticated' 
    });
    return;
  }
  
  const user = req.user;

  // Check for admin claim (multiple formats for compatibility)
  const isAdmin = 
    user.role === 'admin' || 
    user.role === 'superadmin' ||
    user.claims?.admin === true;

  if (!isAdmin) {
    console.log(`[Auth] Admin access denied for ${user.email}`);
    res.status(403).json({ 
      success: false, 
      error: 'Forbidden: admin access required' 
    });
    return;
  }

  next();
}

/**
 * Require superadmin role (platform level)
 */
export function requireSuperAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ 
      success: false, 
      error: 'Not authenticated' 
    });
    return;
  }
  
  const user = req.user;

  if (user.role !== 'superadmin') {
    res.status(403).json({ 
      success: false, 
      error: 'Forbidden: superadmin access required' 
    });
    return;
  }

  next();
}

/**
 * Ensure user has access to tenant
 */
export function requireTenantAccess(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ 
      success: false, 
      error: 'Not authenticated' 
    });
    return;
  }
  
  const user = req.user;
  const requestedTenantId = req.params.tenantId || req.body?.tenantId || req.query.tenantId;

  // Superadmins can access any tenant
  if (user.role === 'superadmin') {
    next();
    return;
  }

  // Check tenant match
  if (requestedTenantId && user.tenantId !== requestedTenantId) {
    res.status(403).json({ 
      success: false, 
      error: 'Access denied to this tenant' 
    });
    return;
  }

  next();
}

/**
 * Optional auth - doesn't fail if no token, just sets user to null
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const header = req.headers.authorization || '';
    const match = header.match(/^Bearer (.+)$/);
    
    if (match) {
      const decoded = await admin.auth().verifyIdToken(match[1]);
      req.user = {
        uid: decoded.uid,
        email: decoded.email || null,
        tenantId: decoded.tenantId || null,
        role: decoded.role || 'user',
        claims: decoded,
      } as AuthUser;
    }
  } catch (err) {
    // Silently ignore auth errors for optional auth
  }
  
  next();
}
