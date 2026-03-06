/**
 * Database configuration - Cloud SQL PostgreSQL
 */

import pg from 'pg';
import { config } from './index.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    const isProduction = config.nodeEnv === 'production';
    
    const poolConfig = {
      // En production, utiliser Unix socket pour Cloud SQL
      ...(isProduction && config.database.connectionName
        ? { host: `/cloudsql/${config.database.connectionName}` }
        : { host: config.database.host, port: config.database.port }
      ),
      user: config.database.user,
      password: config.database.password,
      database: config.database.database,
      // SSL configuration (requis pour Cloud SQL en production)
      ...(config.database.ssl ? {
        ssl: {
          rejectUnauthorized: false, // Cloud SQL utilise des certificats auto-signés
        }
      } : {}),
      max: 10, // Maximum connections in pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };
    
    console.log(`[Database] Initializing pool: host=${poolConfig.host}, database=${poolConfig.database}, user=${poolConfig.user}`);
    
    pool = new Pool(poolConfig);

    pool.on('error', (err) => {
      console.error('[Database] Unexpected error on idle client', err);
    });

    pool.on('connect', (client) => {
      console.log('[Database] New client connected');
      client.query("SELECT current_database() as db, current_user as usr, (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as tables").then((r: any) => {
        console.log(`[Database] Connected to: db=${r.rows[0].db}, user=${r.rows[0].usr}, tables=${r.rows[0].tables}`);
      }).catch((e: any) => {
        console.error(`[Database] Diagnostic query failed: ${e.message}`);
      });
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
  
  if (config.nodeEnv === 'development') {
    console.log('[Database] Query executed', { text: text.substring(0, 100), duration, rows: result.rowCount });
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
    console.error('[Database] Health check failed', error);
    return false;
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[Database] Pool closed');
  }
}
