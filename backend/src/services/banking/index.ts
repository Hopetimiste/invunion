/**
 * Banking Provider Service - Abstraction layer for multiple providers
 * 
 * Supports: Tink, GoCardless, Salt Edge, Plaid
 * 
 * Each provider implements the same interface, allowing easy switching
 * and multi-provider support per tenant.
 */

import { 
  BankingProviderType, 
  BankingProviderInitResponse, 
  BankingProviderAccount,
  NormalizedBankTransaction 
} from '../../types/index.js';
import { 
  BankingProviders, 
  getBankingProviderConfig, 
  isBankingProviderEnabled,
  getEnabledBankingProviders 
} from '../../config/index.js';
import { getSecret, getBankingProviderSecretNames } from '../../config/secrets.js';

// ============================================
// PROVIDER INTERFACE
// ============================================

export interface IBankingProvider {
  readonly name: BankingProviderType;
  
  /**
   * Check if provider is configured and enabled
   */
  isAvailable(): Promise<boolean>;
  
  /**
   * Initialize connection flow (OAuth, Link, etc.)
   * Returns URL to redirect user to
   */
  initializeConnection(params: {
    tenantId: string;
    userId: string;
    connectionId: string;
    market: string;
    locale?: string;
    callbackUrl: string;
  }): Promise<BankingProviderInitResponse>;
  
  /**
   * Complete connection after OAuth callback
   */
  completeConnection(params: {
    connectionId: string;
    code?: string;
    state?: string;
    error?: string;
  }): Promise<{ success: boolean; providerConnectionId?: string; error?: string }>;
  
  /**
   * Fetch accounts for a connection
   */
  getAccounts(providerConnectionId: string): Promise<BankingProviderAccount[]>;
  
  /**
   * Fetch transactions for an account
   */
  getTransactions(params: {
    providerAccountId: string;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<NormalizedBankTransaction[]>;
  
  /**
   * Refresh access token if needed
   */
  refreshAccess?(providerConnectionId: string): Promise<{ success: boolean; expiresAt?: Date }>;
  
  /**
   * Revoke access / disconnect
   */
  disconnect(providerConnectionId: string): Promise<void>;
}

// ============================================
// PROVIDER REGISTRY
// ============================================

const providerRegistry: Map<BankingProviderType, () => Promise<IBankingProvider>> = new Map();

/**
 * Register a provider implementation
 */
export function registerBankingProvider(
  type: BankingProviderType, 
  factory: () => Promise<IBankingProvider>
): void {
  providerRegistry.set(type, factory);
}

/**
 * Get a provider instance
 */
export async function getBankingProvider(type: BankingProviderType): Promise<IBankingProvider> {
  const factory = providerRegistry.get(type);
  if (!factory) {
    throw new Error(`Banking provider not registered: ${type}`);
  }
  return factory();
}

/**
 * Get all available (enabled and configured) providers
 */
export async function getAvailableBankingProviders(): Promise<BankingProviderType[]> {
  const enabled = getEnabledBankingProviders();
  const available: BankingProviderType[] = [];
  
  for (const providerType of enabled) {
    try {
      const provider = await getBankingProvider(providerType);
      if (await provider.isAvailable()) {
        available.push(providerType);
      }
    } catch (error) {
      console.warn(`[Banking] Provider ${providerType} not available:`, error);
    }
  }
  
  return available;
}

// ============================================
// PROVIDER METADATA
// ============================================

export interface BankingProviderInfo {
  id: BankingProviderType;
  name: string;
  description: string;
  logoUrl?: string;
  supportedMarkets: string[];
  features: string[];
}

export const PROVIDER_INFO: Record<BankingProviderType, BankingProviderInfo> = {
  tink: {
    id: 'tink',
    name: 'Tink',
    description: 'European Open Banking platform (PSD2)',
    supportedMarkets: ['FR', 'DE', 'ES', 'IT', 'NL', 'BE', 'AT', 'PT', 'IE', 'FI', 'SE', 'NO', 'DK', 'GB'],
    features: ['accounts', 'transactions', 'balances', 'identity'],
  },
  gocardless: {
    id: 'gocardless',
    name: 'GoCardless Bank Account Data',
    description: 'European Open Banking via GoCardless (formerly Nordigen)',
    supportedMarkets: ['FR', 'DE', 'ES', 'IT', 'NL', 'BE', 'AT', 'PT', 'IE', 'FI', 'SE', 'NO', 'DK', 'GB', 'PL', 'CZ'],
    features: ['accounts', 'transactions', 'balances'],
  },
  salt_edge: {
    id: 'salt_edge',
    name: 'Salt Edge',
    description: 'Global Open Banking platform',
    supportedMarkets: ['*'], // Global
    features: ['accounts', 'transactions', 'balances', 'identity'],
  },
  plaid: {
    id: 'plaid',
    name: 'Plaid',
    description: 'US, Canada & Europe banking connectivity',
    supportedMarkets: ['US', 'CA', 'GB', 'FR', 'ES', 'NL', 'IE'],
    features: ['accounts', 'transactions', 'balances', 'identity', 'investments'],
  },
};

/**
 * Get provider info
 */
export function getBankingProviderInfo(type: BankingProviderType): BankingProviderInfo {
  return PROVIDER_INFO[type];
}

/**
 * Get providers available for a specific market/country
 */
export async function getProvidersForMarket(countryCode: string): Promise<BankingProviderInfo[]> {
  const available = await getAvailableBankingProviders();
  
  return available
    .map(type => PROVIDER_INFO[type])
    .filter(info => 
      info.supportedMarkets.includes('*') || 
      info.supportedMarkets.includes(countryCode.toUpperCase())
    );
}

// ============================================
// PLACEHOLDER IMPLEMENTATIONS
// ============================================

// These will be replaced with actual implementations

class TinkProvider implements IBankingProvider {
  readonly name: BankingProviderType = 'tink';
  
  async isAvailable(): Promise<boolean> {
    return isBankingProviderEnabled('tink');
  }
  
  async initializeConnection(params: {
    tenantId: string;
    userId: string;
    connectionId: string;
    market?: string;
    locale?: string;
    callbackUrl?: string;
  }): Promise<BankingProviderInitResponse> {
    const n8nWebhookUrl = process.env.N8N_TINK_INIT_WEBHOOK;
    
    if (!n8nWebhookUrl) {
      throw new Error('N8N_TINK_INIT_WEBHOOK not configured');
    }
    
    // Call n8n webhook to get Tink Link URL
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: params.tenantId,
        connectionId: params.connectionId,
        market: params.market || 'FR',
        locale: params.locale || 'fr_FR',
        redirectUri: params.callbackUrl,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Tink] n8n webhook error:', errorText);
      throw new Error(`Failed to initialize Tink connection: ${response.status}`);
    }
    
    const data = await response.json() as { 
      success: boolean; 
      tinkLinkUrl: string; 
      expiresIn?: number;
      tinkUserId?: string;
    };
    
    if (!data.success || !data.tinkLinkUrl) {
      throw new Error('Invalid response from n8n webhook');
    }
    
    return {
      provider: 'tink',
      connectionId: params.connectionId,
      redirectUrl: data.tinkLinkUrl,
      expiresAt: data.expiresIn 
        ? new Date(Date.now() + data.expiresIn * 1000)
        : new Date(Date.now() + 3600 * 1000), // 1 hour default
      metadata: { tinkUserId: data.tinkUserId },
    };
  }
  
  async completeConnection(params: any): Promise<any> {
    // Handled by n8n callback workflow
    return { success: true };
  }
  
  async getAccounts(providerConnectionId: string): Promise<BankingProviderAccount[]> {
    // Accounts are fetched by n8n and stored in DB
    // This method would be used for manual refresh
    throw new Error('Use n8n workflow for account sync');
  }
  
  async getTransactions(params: any): Promise<NormalizedBankTransaction[]> {
    // Transactions are fetched by n8n scheduled workflow
    throw new Error('Use n8n workflow for transaction sync');
  }
  
  async disconnect(providerConnectionId: string): Promise<void> {
    // TODO: Call Tink API to revoke access
    console.log(`[Tink] Disconnect requested for ${providerConnectionId}`);
  }
}

class GoCardlessProvider implements IBankingProvider {
  readonly name: BankingProviderType = 'gocardless';
  
  async isAvailable(): Promise<boolean> {
    return isBankingProviderEnabled('gocardless');
  }
  
  async initializeConnection(params: any): Promise<BankingProviderInitResponse> {
    // TODO: Implement GoCardless requisition flow
    throw new Error('GoCardless provider not yet implemented');
  }
  
  async completeConnection(params: any): Promise<any> {
    throw new Error('GoCardless provider not yet implemented');
  }
  
  async getAccounts(providerConnectionId: string): Promise<BankingProviderAccount[]> {
    throw new Error('GoCardless provider not yet implemented');
  }
  
  async getTransactions(params: any): Promise<NormalizedBankTransaction[]> {
    throw new Error('GoCardless provider not yet implemented');
  }
  
  async disconnect(providerConnectionId: string): Promise<void> {
    throw new Error('GoCardless provider not yet implemented');
  }
}

class SaltEdgeProvider implements IBankingProvider {
  readonly name: BankingProviderType = 'salt_edge';
  
  async isAvailable(): Promise<boolean> {
    return isBankingProviderEnabled('salt_edge');
  }
  
  async initializeConnection(params: any): Promise<BankingProviderInitResponse> {
    throw new Error('Salt Edge provider not yet implemented');
  }
  
  async completeConnection(params: any): Promise<any> {
    throw new Error('Salt Edge provider not yet implemented');
  }
  
  async getAccounts(providerConnectionId: string): Promise<BankingProviderAccount[]> {
    throw new Error('Salt Edge provider not yet implemented');
  }
  
  async getTransactions(params: any): Promise<NormalizedBankTransaction[]> {
    throw new Error('Salt Edge provider not yet implemented');
  }
  
  async disconnect(providerConnectionId: string): Promise<void> {
    throw new Error('Salt Edge provider not yet implemented');
  }
}

class PlaidProvider implements IBankingProvider {
  readonly name: BankingProviderType = 'plaid';
  
  async isAvailable(): Promise<boolean> {
    return isBankingProviderEnabled('plaid');
  }
  
  async initializeConnection(params: any): Promise<BankingProviderInitResponse> {
    throw new Error('Plaid provider not yet implemented');
  }
  
  async completeConnection(params: any): Promise<any> {
    throw new Error('Plaid provider not yet implemented');
  }
  
  async getAccounts(providerConnectionId: string): Promise<BankingProviderAccount[]> {
    throw new Error('Plaid provider not yet implemented');
  }
  
  async getTransactions(params: any): Promise<NormalizedBankTransaction[]> {
    throw new Error('Plaid provider not yet implemented');
  }
  
  async disconnect(providerConnectionId: string): Promise<void> {
    throw new Error('Plaid provider not yet implemented');
  }
}

// Register providers
registerBankingProvider('tink', async () => new TinkProvider());
registerBankingProvider('gocardless', async () => new GoCardlessProvider());
registerBankingProvider('salt_edge', async () => new SaltEdgeProvider());
registerBankingProvider('plaid', async () => new PlaidProvider());

export { TinkProvider, GoCardlessProvider, SaltEdgeProvider, PlaidProvider };
