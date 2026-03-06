/**
 * Invunion Worker Service (Cloud Run #2)
 *
 * Receives Pub/Sub push messages and processes them asynchronously:
 *   POST /pubsub/ingest    — normalise + persist transactions/invoices
 *   POST /pubsub/matching  — deterministic pre-filter matching (AI in M7)
 *   POST /pubsub/alerts    — generate alerts (overdue, matches, anomalies)
 *
 * Security:
 *   - In production, deploy with --no-allow-unauthenticated.
 *   - Pub/Sub subscriptions are configured with a service account that has
 *     roles/run.invoker → GCP verifies the OIDC token automatically.
 *   - The PUBSUB_PUSH_SECRET env var provides an optional secondary check
 *     for local development / non-GCP environments.
 */

import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { workerConfig, validateWorkerConfig } from './config.js';
import { healthCheck, closePool } from './db.js';
import { handleIngest } from './handlers/ingest.js';
import { handleMatching } from './handlers/matching.js';
import { handleAlerts } from './handlers/alerts.js';

validateWorkerConfig();

const app = express();

// ─── Security ────────────────────────────────────────────────────────────────

app.use(helmet({ contentSecurityPolicy: false }));
app.set('trust proxy', 1);

// ─── Body parsing ─────────────────────────────────────────────────────────────

// Pub/Sub push messages are always JSON; limit body to avoid abuse
app.use(express.json({ limit: '5mb' }));

// ─── Logging ─────────────────────────────────────────────────────────────────

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (workerConfig.nodeEnv === 'production' || duration > 500) {
      console.log(
        JSON.stringify({
          type: 'REQUEST',
          method: req.method,
          path: req.path,
          status: res.statusCode,
          duration,
        })
      );
    }
  });
  next();
});

// ─── Verify Pub/Sub push authenticity ────────────────────────────────────────
//
// In production, Pub/Sub sends an OIDC token in the Authorization header.
// Cloud Run with IAM enabled automatically validates this token.
// For additional security, we also check a shared secret in X-Pubsub-Token header.

function verifyPushSecret(req: Request, res: Response, next: NextFunction): void {
  // In development, skip verification
  if (workerConfig.nodeEnv === 'development') {
    return next();
  }

  const secret = workerConfig.pubsub.pushSecret;
  
  // In production, if secret is configured, verify it
  if (secret) {
    const token = req.headers['x-pubsub-token'];
    if (token !== secret) {
      console.warn('[Worker] Unauthorized Pub/Sub request (invalid token)');
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
  }
  
  // If no secret configured, rely on Cloud Run IAM + OIDC (default Pub/Sub behavior)
  next();
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// Health check (publicly accessible — Cloud Run requires it)
app.get('/health', async (_req: Request, res: Response) => {
  const dbOk = await healthCheck();
  const status = dbOk ? 200 : 503;
  res.status(status).json({
    service: 'invunion-worker',
    version: '1.0.0',
    status: dbOk ? 'healthy' : 'degraded',
    database: dbOk ? 'connected' : 'unreachable',
    timestamp: new Date().toISOString(),
  });
});

// Pub/Sub push endpoints
app.post('/pubsub/ingest', verifyPushSecret, handleIngest);
app.post('/pubsub/matching', verifyPushSecret, handleMatching);
app.post('/pubsub/alerts', verifyPushSecret, handleAlerts);

// Root
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'Invunion Worker',
    version: '1.0.0',
    endpoints: ['/health', '/pubsub/ingest', '/pubsub/matching', '/pubsub/alerts'],
  });
});

// 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Worker] Unhandled error', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ─── Start ───────────────────────────────────────────────────────────────────

const server = app.listen(workerConfig.port, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                  INVUNION WORKER                           ║
╠════════════════════════════════════════════════════════════╣
║  Version:     1.0.0                                        ║
║  Port:        ${workerConfig.port.toString().padEnd(44)}║
║  Environment: ${workerConfig.nodeEnv.padEnd(44)}║
║  Endpoints:   /pubsub/ingest | /pubsub/matching | /pubsub/alerts ║
╚════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log('[Worker] SIGTERM received, shutting down gracefully');
  server.close(async () => {
    await closePool();
    console.log('[Worker] Shutdown complete');
    process.exit(0);
  });
});

export default app;
