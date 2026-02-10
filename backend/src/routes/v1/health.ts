/**
 * Health check routes
 */

import { Router, Request, Response } from 'express';
import { healthCheck as dbHealthCheck } from '../../config/database.js';

const router = Router();

/**
 * GET /health - Basic health check
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({ 
    success: true,
    status: 'ok',
    service: 'invunion-api',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/ready - Readiness check (includes DB)
 */
router.get('/health/ready', async (req: Request, res: Response) => {
  const checks: Record<string, boolean> = {
    api: true,
  };
  
  // Check database
  try {
    checks.database = await dbHealthCheck();
  } catch (err) {
    checks.database = false;
  }
  
  const allHealthy = Object.values(checks).every(Boolean);
  
  res.status(allHealthy ? 200 : 503).json({
    success: allHealthy,
    status: allHealthy ? 'ready' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
});

export default router;
