/**
 * Configuration centralisée - Invunion API Core
 * Toutes les variables d'environnement et constantes
 */

// ============================================
// BANKING PROVIDERS - Supported providers
// ============================================

export const BankingProviders = {
  TINK: 'tink',
  SALT_EDGE: 'salt_edge',
  GOCARDLESS: 'gocardless', // Also known as Bankart in some regions
  PLAID: 'plaid',
  // Add more providers as needed
} as const;

export type BankingProvider = typeof BankingProviders[keyof typeof BankingProviders];

// List of all enabled banking providers
export const ENABLED_BANKING_PROVIDERS: BankingProvider[] = [
  BankingProviders.TINK,
  BankingProviders.GOCARDLESS,
  // Add more as you integrate them
];

export const config = {
  // Server
  port: parseInt(process.env.PORT || '8080', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // GCP
  projectId: process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'br-project-481607',
  
  // Firebase
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || 'br-project-481607',
  },
  
  // Cloud SQL PostgreSQL
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'invunion',
    password: process.env.DB_PASSWORD || 'invunion_dev_password',
    database: process.env.DB_NAME || 'invunion_db',
    ssl: process.env.DB_SSL === 'true',
    // Cloud SQL specific (production)
    connectionName: process.env.CLOUD_SQL_CONNECTION_NAME || '',
  },
  
  // Pub/Sub Topics
  pubsub: {
    topicIngest: process.env.PUBSUB_TOPIC_INGEST || 'ingest',
    topicMatching: process.env.PUBSUB_TOPIC_MATCHING || 'matching',
    topicAlerts: process.env.PUBSUB_TOPIC_ALERTS || 'alerts',
  },
  
  // CORS
  cors: {
    allowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173,https://*.pages.dev,https://invunion.com,https://*.invunion.com,https://app.invunion.com')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    adminMaxRequests: parseInt(process.env.RATE_LIMIT_ADMIN_MAX || '60', 10),
  },
  
  // ============================================
  // BANKING PROVIDERS CONFIGURATION
  // ============================================
  
  bankingProviders: {
    // Tink (Europe - PSD2)
    tink: {
      enabled: process.env.TINK_ENABLED === 'true',
      clientId: process.env.TINK_CLIENT_ID || '', // Loaded from Secret Manager
      clientSecret: process.env.TINK_CLIENT_SECRET || '', // Loaded from Secret Manager
      apiUrl: process.env.TINK_API_URL || 'https://api.tink.com',
      callbackUrl: process.env.TINK_CALLBACK_URL || '',
      // Supported markets (ISO country codes)
      supportedMarkets: ['FR', 'DE', 'ES', 'IT', 'NL', 'BE', 'AT', 'PT', 'IE', 'FI', 'SE', 'NO', 'DK', 'GB'],
    },
    
    // GoCardless / Bankart (Europe - PSD2)
    gocardless: {
      enabled: process.env.GOCARDLESS_ENABLED === 'true',
      secretId: process.env.GOCARDLESS_SECRET_ID || '', // Loaded from Secret Manager
      secretKey: process.env.GOCARDLESS_SECRET_KEY || '', // Loaded from Secret Manager
      apiUrl: process.env.GOCARDLESS_API_URL || 'https://bankaccountdata.gocardless.com/api/v2',
      callbackUrl: process.env.GOCARDLESS_CALLBACK_URL || '',
      // Access validity in days (PSD2 requires re-auth every 90 days)
      accessValidityDays: 90,
      supportedMarkets: ['FR', 'DE', 'ES', 'IT', 'NL', 'BE', 'AT', 'PT', 'IE', 'FI', 'SE', 'NO', 'DK', 'GB', 'PL', 'CZ'],
    },
    
    // Salt Edge (Global coverage)
    saltEdge: {
      enabled: process.env.SALT_EDGE_ENABLED === 'true',
      appId: process.env.SALT_EDGE_APP_ID || '', // Loaded from Secret Manager
      secret: process.env.SALT_EDGE_SECRET || '', // Loaded from Secret Manager
      apiUrl: process.env.SALT_EDGE_API_URL || 'https://www.saltedge.com/api/v5',
      callbackUrl: process.env.SALT_EDGE_CALLBACK_URL || '',
      supportedMarkets: ['*'], // Global coverage
    },
    
    // Plaid (US, Canada, UK, Europe)
    plaid: {
      enabled: process.env.PLAID_ENABLED === 'true',
      clientId: process.env.PLAID_CLIENT_ID || '', // Loaded from Secret Manager
      secret: process.env.PLAID_SECRET || '', // Loaded from Secret Manager
      apiUrl: process.env.PLAID_API_URL || 'https://production.plaid.com',
      environment: process.env.PLAID_ENV || 'sandbox', // sandbox, development, production
      supportedMarkets: ['US', 'CA', 'GB', 'FR', 'ES', 'NL', 'IE'],
    },
  },
  
  // Legacy alias for backwards compatibility
  tink: {
    clientId: process.env.TINK_CLIENT_ID || '',
    clientSecret: process.env.TINK_CLIENT_SECRET || '',
    apiUrl: process.env.TINK_API_URL || 'https://api.tink.com',
    callbackUrl: process.env.TINK_CALLBACK_URL || '',
  },
  
  // Upload limits
  upload: {
    maxFileSize: parseInt(process.env.UPLOAD_MAX_SIZE || '10485760', 10), // 10MB
    allowedMimeTypes: ['text/csv', 'application/json'],
  },
} as const;

// Type export for config
export type Config = typeof config;

// Validation au démarrage
export function validateConfig(): void {
  const required = [
    'FIREBASE_PROJECT_ID',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0 && config.nodeEnv === 'production') {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  console.log(`[Config] Environment: ${config.nodeEnv}`);
  console.log(`[Config] Firebase Project: ${config.firebase.projectId}`);
  
  // Log enabled banking providers
  const enabledProviders = Object.entries(config.bankingProviders)
    .filter(([_, cfg]) => cfg.enabled)
    .map(([name]) => name);
  
  console.log(`[Config] Banking Providers: ${enabledProviders.length > 0 ? enabledProviders.join(', ') : 'none enabled'}`);
}

/**
 * Get configuration for a specific banking provider
 */
export function getBankingProviderConfig(provider: BankingProvider) {
  switch (provider) {
    case BankingProviders.TINK:
      return config.bankingProviders.tink;
    case BankingProviders.GOCARDLESS:
      return config.bankingProviders.gocardless;
    case BankingProviders.SALT_EDGE:
      return config.bankingProviders.saltEdge;
    case BankingProviders.PLAID:
      return config.bankingProviders.plaid;
    default:
      throw new Error(`Unknown banking provider: ${provider}`);
  }
}

/**
 * Check if a banking provider is enabled
 */
export function isBankingProviderEnabled(provider: BankingProvider): boolean {
  const providerConfig = getBankingProviderConfig(provider);
  return providerConfig.enabled;
}

/**
 * Get list of enabled banking providers
 */
export function getEnabledBankingProviders(): BankingProvider[] {
  return ENABLED_BANKING_PROVIDERS.filter(provider => {
    try {
      return isBankingProviderEnabled(provider);
    } catch {
      return false;
    }
  });
}
