/**
 * Admin routes - Platform administration
 */

import { Router, Request, Response } from 'express';
import { Logging } from '@google-cloud/logging';
import { requireAuth, requireAdmin, requireSuperAdmin } from '../../middleware/auth.js';
import { validateQuery, PaginationSchema } from '../../middleware/validate.js';
import { asyncHandler, NotFoundError } from '../../middleware/errorHandler.js';
import { Tenant } from '../../types/index.js';
import { query } from '../../config/database.js';
import { config } from '../../config/index.js';
import { z } from 'zod';

const router = Router();
const logging = new Logging();

// Apply auth to all routes
router.use(requireAuth);
router.use(requireAdmin);

// ============================================
// SCHEMAS
// ============================================

const AdminLogsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  pageToken: z.string().optional(),
  severity: z.enum(['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']).optional(),
  q: z.string().max(100).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

// ============================================
// ROUTES
// ============================================

/**
 * GET /admin/summary - Admin dashboard summary
 */
router.get('/summary', asyncHandler(async (req: Request, res: Response) => {
  const result = await query(`
    SELECT 
      (SELECT COUNT(*) FROM tenants) as total_tenants,
      (SELECT COUNT(*) FROM tenants WHERE status = 'active') as active_tenants,
      (SELECT COUNT(*) FROM bank_connections WHERE status = 'active') as connected_connections,
      (SELECT COUNT(*) FROM alerts WHERE created_at > NOW() - INTERVAL '24 hours' AND alert_type = 'sync_error') as sync_failures_last_24h,
      (SELECT COUNT(*) FROM transactions WHERE created_at > NOW() - INTERVAL '24 hours') as transactions_last_24h,
      (SELECT COUNT(*) FROM matches WHERE created_at > NOW() - INTERVAL '24 hours') as matches_last_24h
  `);
  
  res.json({
    success: true,
    data: {
      totalTenants: parseInt(result.rows[0].total_tenants),
      activeTenants: parseInt(result.rows[0].active_tenants),
      connectedConnections: parseInt(result.rows[0].connected_connections),
      syncFailuresLast24h: parseInt(result.rows[0].sync_failures_last_24h),
      transactionsLast24h: parseInt(result.rows[0].transactions_last_24h),
      matchesLast24h: parseInt(result.rows[0].matches_last_24h),
    },
  });
}));

/**
 * GET /admin/tenants - List all tenants
 */
router.get('/tenants',
  validateQuery(PaginationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { page, pageSize, sortOrder } = req.query as any;
    const offset = (page - 1) * pageSize;
    
    const countResult = await query('SELECT COUNT(*) FROM tenants');
    const total = parseInt(countResult.rows[0].count, 10);
    
    const result = await query<Tenant>(
      `SELECT t.*, 
        (SELECT COUNT(*) FROM users WHERE tenant_id = t.id) as user_count,
        (SELECT COUNT(*) FROM bank_connections WHERE tenant_id = t.id AND status = 'active') as active_connections,
        (SELECT MAX(created_at) FROM transactions WHERE tenant_id = t.id) as last_transaction_at
       FROM tenants t
       ORDER BY t.created_at ${sortOrder === 'asc' ? 'ASC' : 'DESC'}
       LIMIT $1 OFFSET $2`,
      [pageSize, offset]
    );
    
    res.json({
      success: true,
      data: {
        items: result.rows,
        total,
        page,
        pageSize,
        hasMore: offset + result.rows.length < total,
      },
    });
  })
);

/**
 * GET /admin/tenants/:id - Get tenant details
 */
router.get('/tenants/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const result = await query(
    `SELECT t.*,
      (SELECT COUNT(*) FROM users WHERE tenant_id = t.id) as user_count,
      (SELECT COUNT(*) FROM transactions WHERE tenant_id = t.id) as transaction_count,
      (SELECT COUNT(*) FROM invoices WHERE tenant_id = t.id) as invoice_count,
      (SELECT COUNT(*) FROM matches WHERE tenant_id = t.id AND status = 'active') as match_count
     FROM tenants t
     WHERE t.id = $1`,
    [id]
  );
  
  if (result.rows.length === 0) {
    throw new NotFoundError('Tenant');
  }
  
  res.json({
    success: true,
    data: result.rows[0],
  });
}));

/**
 * POST /admin/tenants/:id/disable - Disable tenant
 */
router.post('/tenants/:id/disable',
  requireSuperAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const result = await query(
      'UPDATE tenants SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
      ['suspended', id]
    );
    
    if (result.rows.length === 0) {
      throw new NotFoundError('Tenant');
    }
    
    // TODO: Revoke all user sessions for this tenant
    
    res.json({
      success: true,
      message: 'Tenant disabled',
    });
  })
);

/**
 * POST /admin/tenants/:id/enable - Enable tenant
 */
router.post('/tenants/:id/enable',
  requireSuperAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const result = await query(
      'UPDATE tenants SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
      ['active', id]
    );
    
    if (result.rows.length === 0) {
      throw new NotFoundError('Tenant');
    }
    
    res.json({
      success: true,
      message: 'Tenant enabled',
    });
  })
);

/**
 * GET /admin/logs - Get Cloud Logging logs
 */
router.get('/logs',
  validateQuery(AdminLogsQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { limit, pageToken, severity, q, from, to } = req.query as any;
    
    let filter = `
resource.type="cloud_run_revision"
resource.labels.service_name="invunion-api"
`.trim();

    if (severity) filter += `\nseverity>=${severity}`;
    if (from) filter += `\ntimestamp>="${new Date(from).toISOString()}"`;
    if (to) filter += `\ntimestamp<="${new Date(to).toISOString()}"`;
    if (q) filter += `\n"${q.replace(/"/g, '\\"')}"`;

    try {
      const [entries, , apiResponse] = await logging.getEntries({
        filter,
        orderBy: 'timestamp desc',
        pageSize: limit,
        pageToken,
      });

      const logs = entries.map((e: any) => {
        const md = e.metadata || {};
        const payload = typeof e.data === 'string'
          ? e.data
          : e.data?.message || e.data?.msg || JSON.stringify(e.data);

        return {
          timestamp: md.timestamp || null,
          level: md.severity || 'DEFAULT',
          source: 'cloud_run',
          tenant_id: null,
          message: payload || null,
          trace: md.trace || null,
          insertId: md.insertId || null,
        };
      });

      res.json({
        success: true,
        data: {
          logs,
          nextPageToken: (apiResponse as any)?.nextPageToken || null,
        },
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch logs',
        message: config.nodeEnv === 'development' ? err.message : undefined,
      });
    }
  })
);

/**
 * POST /admin/logs/test - Test log endpoint
 */
router.post('/logs/test', asyncHandler(async (req: Request, res: Response) => {
  console.log(JSON.stringify({
    type: 'ADMIN_LOG_TEST',
    ts: new Date().toISOString(),
    from: req.user!.email,
    message: req.body?.message || 'hello from test endpoint',
  }));
  
  res.json({
    success: true,
    message: 'Log test sent',
  });
}));

export default router;
