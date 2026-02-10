/**
 * Secret Manager integration
 */

import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { config } from './index.js';

let secretClient: SecretManagerServiceClient | null = null;
const secretsCache: Map<string, { value: string; expiresAt: number }> = new Map();

// Cache TTL: 5 minutes
const CACHE_TTL_MS = 5 * 60 * 1000;

function getSecretClient(): SecretManagerServiceClient {
  if (!secretClient) {
    secretClient = new SecretManagerServiceClient();
    console.log('[SecretManager] Client initialized');
  }
  return secretClient;
}

/**
 * Get a secret from Secret Manager with caching
 */
export async function getSecret(secretName: string): Promise<string> {
  // Check cache first
  const cached = secretsCache.get(secretName);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }
  
  // In development, fallback to env vars
  if (config.nodeEnv === 'development') {
    const envKey = secretName.toUpperCase().replace(/-/g, '_');
    const envValue = process.env[envKey];
    if (envValue) {
      console.log(`[SecretManager] Using env var for ${secretName}`);
      return envValue;
    }
  }
  
  try {
    const client = getSecretClient();
    const name = `projects/${config.projectId}/secrets/${secretName}/versions/latest`;
    
    const [version] = await client.accessSecretVersion({ name });
    const value = version.payload?.data?.toString() || '';
    
    // Cache the value
    secretsCache.set(secretName, {
      value,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    
    console.log(`[SecretManager] Secret ${secretName} loaded`);
    return value;
  } catch (error) {
    console.error(`[SecretManager] Failed to get secret ${secretName}`, error);
    throw new Error(`Failed to retrieve secret: ${secretName}`);
  }
}

/**
 * Load multiple secrets at once
 */
export async function loadSecrets(secretNames: string[]): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  
  await Promise.all(
    secretNames.map(async (name) => {
      try {
        const value = await getSecret(name);
        results.set(name, value);
      } catch (error) {
        console.warn(`[SecretManager] Could not load secret: ${name}`);
      }
    })
  );
  
  return results;
}

/**
 * Clear secrets cache (useful for rotation)
 */
export function clearSecretsCache(): void {
  secretsCache.clear();
  console.log('[SecretManager] Cache cleared');
}

/**
 * Pre-defined secret names
 */
export const SecretNames = {
  // Database
  DB_PASSWORD: 'db-password',
  
  // Firebase
  FIREBASE_ADMIN_KEY: 'firebase-admin-key',
  
  // Banking Providers
  TINK_CLIENT_ID: 'tink-client-id',
  TINK_CLIENT_SECRET: 'tink-client-secret',
  
  GOCARDLESS_SECRET_ID: 'gocardless-secret-id',
  GOCARDLESS_SECRET_KEY: 'gocardless-secret-key',
  
  SALT_EDGE_APP_ID: 'salt-edge-app-id',
  SALT_EDGE_SECRET: 'salt-edge-secret',
  
  PLAID_CLIENT_ID: 'plaid-client-id',
  PLAID_SECRET: 'plaid-secret',
  
  // Email
  SENDGRID_API_KEY: 'sendgrid-api-key',
} as const;

/**
 * Get secret names for a specific banking provider
 */
export function getBankingProviderSecretNames(provider: string): string[] {
  switch (provider) {
    case 'tink':
      return [SecretNames.TINK_CLIENT_ID, SecretNames.TINK_CLIENT_SECRET];
    case 'gocardless':
      return [SecretNames.GOCARDLESS_SECRET_ID, SecretNames.GOCARDLESS_SECRET_KEY];
    case 'salt_edge':
      return [SecretNames.SALT_EDGE_APP_ID, SecretNames.SALT_EDGE_SECRET];
    case 'plaid':
      return [SecretNames.PLAID_CLIENT_ID, SecretNames.PLAID_SECRET];
    default:
      return [];
  }
}
