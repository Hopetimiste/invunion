/**
 * Invunion Worker - Database access (Cloud SQL PostgreSQL)
 */

import pg from 'pg';
import { workerConfig } from './config.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    const isProduction = workerConfig.nodeEnv === 'production';

    const poolConfig = {
      ...(isProduction && workerConfig.database.connectionName
        ? { host: `/cloudsql/${workerConfig.database.connectionName}` }
        : { host: workerConfig.database.host, port: workerConfig.database.port }),
      user: workerConfig.database.user,
      password: workerConfig.database.password,
      database: workerConfig.database.database,
      ...(workerConfig.database.ssl
        ? { ssl: { rejectUnauthorized: false } }
        : {}),
      // Worker needs fewer connections than the API
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

    console.log(
      `[Worker DB] Initializing pool: host=${poolConfig.host}, database=${poolConfig.database}`
    );

    pool = new Pool(poolConfig);
    pool.on('error', (err) => {
      console.error('[Worker DB] Unexpected error on idle client', err);
    });
  }

  return pool;
}

export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  const result = await getPool().query<T>(text, params);
  const duration = Date.now() - start;

  if (workerConfig.nodeEnv === 'development') {
    console.log('[Worker DB] Query executed', {
      text: text.substring(0, 100),
      duration,
      rows: result.rowCount,
    });
  }

  return result;
}

export async function getClient(): Promise<pg.PoolClient> {
  return getPool().connect();
}

export async function transaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW()');
    return result.rowCount === 1;
  } catch (error) {
    console.error('[Worker DB] Health check failed', error);
    return false;
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[Worker DB] Pool closed');
  }
}
