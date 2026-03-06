/**
 * Invunion Worker - Configuration
 * Subset of the main API config, scoped to worker needs
 */

export const workerConfig = {
  port: parseInt(process.env.PORT || '8080', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  projectId: process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'invunion-prod',

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'invunion',
    password: process.env.DB_PASSWORD || 'invunion_dev_password',
    database: process.env.DB_NAME || 'invunion_db',
    ssl: process.env.DB_SSL === 'true',
    connectionName: process.env.CLOUD_SQL_CONNECTION_NAME || '',
  },

  pubsub: {
    topicIngest: process.env.PUBSUB_TOPIC_INGEST || 'ingest',
    topicMatching: process.env.PUBSUB_TOPIC_MATCHING || 'matching',
    topicAlerts: process.env.PUBSUB_TOPIC_ALERTS || 'alerts',
    // Shared secret to validate that requests come from GCP Pub/Sub (dev fallback)
    // In production, Cloud Run IAM + Pub/Sub OIDC token is the primary mechanism
    pushSecret: process.env.PUBSUB_PUSH_SECRET || '',
  },
} as const;

export type WorkerConfig = typeof workerConfig;

export function validateWorkerConfig(): void {
  const required = ['DB_USER', 'DB_NAME', 'DB_PASSWORD'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0 && workerConfig.nodeEnv === 'production') {
    throw new Error(`[Worker] Missing required env vars: ${missing.join(', ')}`);
  }

  console.log(`[Worker Config] Environment: ${workerConfig.nodeEnv}`);
  console.log(`[Worker Config] GCP Project: ${workerConfig.projectId}`);
}
