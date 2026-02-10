/**
 * Alerts routes
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody, validateQuery, PaginationSchema } from '../../middleware/validate.js';
import { asyncHandler, NotFoundError } from '../../middleware/errorHandler.js';
import { Alert } from '../../types/index.js';
import { query } from '../../config/database.js';

const router = Router();

router.use(requireAuth);

// ============================================
// SCHEMAS
// ============================================

const ListAlertsSchema = PaginationSchema.extend({
  status: z.enum(['unread', 'read', 'dismissed']).optional(),
  alertType: z.enum(['new_match', 'low_confidence', 'anomaly', 'sync_error']).optional(),
});

const UpdateAlertSchema = z.object({
  status: z.enum(['unread', 'read', 'dismissed']),
});

const BatchUpdateSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  status: z.enum(['read', 'dismissed']),
});

// ============================================
// ROUTES
// ============================================

/**
 * GET /alerts - List alerts
 */
router.get('/', 
  validateQuery(ListAlertsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { page, pageSize, sortOrder, status, alertType } = req.query as any;
    
    const offset = (page - 1) * pageSize;
    const params: any[] = [tenantId];
    let paramIndex = 2;
    
    let whereClause = 'WHERE tenant_id = $1';
    
    if (status) {
      whereClause += ` AND status = $${paramIndex++}`;
      params.push(status);
    }
    
    if (alertType) {
      whereClause += ` AND alert_type = $${paramIndex++}`;
      params.push(alertType);
    }
    
    const orderDir = sortOrder === 'asc' ? 'ASC' : 'DESC';
    
    const countResult = await query(
      `SELECT COUNT(*) FROM alerts ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);
    
    const result = await query<Alert>(
      `SELECT * FROM alerts ${whereClause}
       ORDER BY created_at ${orderDir}
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, pageSize, offset]
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
 * GET /alerts/unread-count - Get unread alert count
 */
router.get('/unread-count', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  
  const result = await query(
    `SELECT COUNT(*) FROM alerts WHERE tenant_id = $1 AND status = 'unread'`,
    [tenantId]
  );
  
  res.json({
    success: true,
    data: {
      count: parseInt(result.rows[0].count, 10),
    },
  });
}));

/**
 * GET /alerts/:id - Get single alert
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;
  
  const result = await query<Alert>(
    'SELECT * FROM alerts WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
  
  if (result.rows.length === 0) {
    throw new NotFoundError('Alert');
  }
  
  res.json({
    success: true,
    data: result.rows[0],
  });
}));

/**
 * PUT /alerts/:id - Update alert status
 */
router.put('/:id',
  validateBody(UpdateAlertSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const { status } = req.body;
    
    const result = await query<Alert>(
      'UPDATE alerts SET status = $1 WHERE id = $2 AND tenant_id = $3 RETURNING *',
      [status, id, tenantId]
    );
    
    if (result.rows.length === 0) {
      throw new NotFoundError('Alert');
    }
    
    res.json({
      success: true,
      data: result.rows[0],
    });
  })
);

/**
 * POST /alerts/batch-update - Update multiple alerts at once
 */
router.post('/batch-update',
  validateBody(BatchUpdateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { ids, status } = req.body;
    
    const result = await query(
      `UPDATE alerts SET status = $1 
       WHERE id = ANY($2::uuid[]) AND tenant_id = $3
       RETURNING id`,
      [status, ids, tenantId]
    );
    
    res.json({
      success: true,
      data: {
        updated: result.rowCount,
      },
    });
  })
);

/**
 * POST /alerts/mark-all-read - Mark all alerts as read
 */
router.post('/mark-all-read', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  
  const result = await query(
    `UPDATE alerts SET status = 'read' WHERE tenant_id = $1 AND status = 'unread'`,
    [tenantId]
  );
  
  res.json({
    success: true,
    data: {
      updated: result.rowCount,
    },
  });
}));

export default router;
