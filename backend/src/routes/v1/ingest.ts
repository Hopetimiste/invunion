/**
 * Ingest routes - CSV upload and webhooks
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { parse } from 'csv-parse';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler, ValidationError, AppError } from '../../middleware/errorHandler.js';
import { ImportJob } from '../../types/index.js';
import { query } from '../../config/database.js';
import { publishToIngest } from '../../config/pubsub.js';
import { config } from '../../config/index.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.upload.maxFileSize,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = config.upload.allowedMimeTypes as readonly string[];
    if (allowedTypes.includes(file.mimetype) || 
        file.originalname.endsWith('.csv') || 
        file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and JSON are allowed.'));
    }
  },
});

// ============================================
// SCHEMAS
// ============================================

const WebhookTinkSchema = z.object({
  event: z.string(),
  payload: z.any(),
});

// ============================================
// ROUTES
// ============================================

/**
 * POST /ingest/upload - Upload CSV/JSON file
 */
router.post('/upload',
  requireAuth,
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.uid;
    
    if (!req.file) {
      throw new ValidationError('No file uploaded');
    }
    
    const fileType = req.body.type as 'transactions' | 'invoices';
    if (!fileType || !['transactions', 'invoices'].includes(fileType)) {
      throw new ValidationError('Invalid file type. Must be "transactions" or "invoices"');
    }
    
    const fileFormat = req.file.originalname.endsWith('.json') ? 'json' : 'csv';
    let data: any[];
    
    // Parse file
    try {
      if (fileFormat === 'json') {
        data = JSON.parse(req.file.buffer.toString());
        if (!Array.isArray(data)) {
          throw new Error('JSON must be an array');
        }
      } else {
        // Parse CSV
        data = await new Promise((resolve, reject) => {
          parse(req.file!.buffer, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
          }, (err, records) => {
            if (err) reject(err);
            else resolve(records);
          });
        });
      }
    } catch (error: any) {
      throw new ValidationError(`Failed to parse file: ${error.message}`);
    }
    
    if (data.length === 0) {
      throw new ValidationError('File is empty');
    }
    
    if (data.length > 10000) {
      throw new ValidationError('File too large. Maximum 10,000 rows per upload.');
    }
    
    // Create import job
    const jobId = uuidv4();
    await query<ImportJob>(
      `INSERT INTO import_jobs (
        id, tenant_id, user_id, file_name, file_type, file_format, 
        total_rows, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW())`,
      [jobId, tenantId, userId, req.file.originalname, fileType, fileFormat, data.length]
    );
    
    // Publish to Pub/Sub for async processing
    await publishToIngest(tenantId!, 'csv_upload', {
      importJobId: jobId,
      fileType,
      data,
    }, jobId);
    
    console.log(`[Ingest] Upload queued: ${jobId} (${data.length} rows)`);
    
    res.status(202).json({
      success: true,
      data: {
        jobId,
        fileName: req.file.originalname,
        fileType,
        totalRows: data.length,
        status: 'pending',
        message: 'File uploaded and queued for processing',
      },
    });
  })
);

/**
 * GET /ingest/jobs - List import jobs
 */
router.get('/jobs',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    
    const result = await query<ImportJob>(
      `SELECT * FROM import_jobs 
       WHERE tenant_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [tenantId]
    );
    
    res.json({
      success: true,
      data: result.rows,
    });
  })
);

/**
 * GET /ingest/jobs/:id - Get import job status
 */
router.get('/jobs/:id',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    
    const result = await query<ImportJob>(
      'SELECT * FROM import_jobs WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Import job not found', 404);
    }
    
    res.json({
      success: true,
      data: result.rows[0],
    });
  })
);

/**
 * POST /ingest/webhook/tink - Tink webhook endpoint
 */
router.post('/webhook/tink',
  validateBody(WebhookTinkSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { event, payload } = req.body;
    
    // TODO: Validate webhook signature from Tink
    // const signature = req.headers['x-tink-signature'];
    
    console.log(`[Webhook] Tink event received: ${event}`);
    
    // Extract tenant ID from payload (depends on Tink setup)
    const tenantId = payload?.externalUserId || payload?.userId;
    
    if (!tenantId) {
      console.warn('[Webhook] Tink webhook without tenant ID');
      res.status(200).json({ received: true });
      return;
    }
    
    // Check idempotency (prevent duplicate processing)
    const eventId = payload?.eventId || `${event}-${Date.now()}`;
    const existingEvent = await query(
      'SELECT id FROM webhook_events WHERE event_id = $1',
      [eventId]
    );
    
    if (existingEvent.rows.length > 0) {
      console.log(`[Webhook] Duplicate event ignored: ${eventId}`);
      res.status(200).json({ received: true, duplicate: true });
      return;
    }
    
    // Store event for idempotency
    await query(
      `INSERT INTO webhook_events (event_id, provider, payload, received_at)
       VALUES ($1, 'tink', $2, NOW())`,
      [eventId, JSON.stringify(payload)]
    );
    
    // Publish to ingest topic
    await publishToIngest(tenantId, 'tink_webhook', {
      event,
      payload,
    }, eventId);
    
    res.status(200).json({ received: true });
  })
);

/**
 * POST /ingest/webhook/:provider - Generic webhook endpoint for invoicing providers
 */
router.post('/webhook/:provider',
  asyncHandler(async (req: Request, res: Response) => {
    const { provider } = req.params;
    const payload = req.body;
    
    console.log(`[Webhook] ${provider} event received`);
    
    // TODO: Validate webhook signature per provider
    // TODO: Extract tenant ID based on provider format
    
    const eventId = `${provider}-${Date.now()}`;
    
    // For now, just acknowledge
    // Full implementation depends on specific provider
    
    res.status(200).json({ received: true, provider });
  })
);

export default router;
