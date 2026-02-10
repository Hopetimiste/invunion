/**
 * Banking service - handles bank connections and Open Banking API calls
 */

import { api, buildQueryString } from './api/client';

// ============================================
// Types
// ============================================

export interface BankingProvider {
  id: string;
  name: string;
  displayName: string;
  logo?: string;
  supportedMarkets: string[];
  enabled: boolean;
}

export interface BankConnection {
  id: string;
  tenant_id: string;
  provider: string;
  status: string;
  access_expires_at: string | null;
  last_sync_at: string | null;
  created_at: string;
}

export interface InitBankConnectionResponse {
  redirectUrl: string;
  connectionId: string;
}

// ============================================
// API Functions
// ============================================

const ENDPOINT = '/connections/banking';

export async function getBankingProviders(market?: string): Promise<BankingProvider[]> {
  const query = market ? `?market=${market}` : "";
  return api.get(`${ENDPOINT}/providers${query}`);
}

export async function getBankConnections(provider?: string): Promise<BankConnection[]> {
  const query = provider ? `?provider=${provider}` : "";
  return api.get(`${ENDPOINT}${query}`);
}

export async function initBankConnection(
  provider: string, 
  market: string, 
  locale?: string
): Promise<InitBankConnectionResponse> {
  return api.post(`${ENDPOINT}/init`, { provider, market, locale });
}

export async function syncBankConnection(connectionId: string): Promise<void> {
  return api.post(`${ENDPOINT}/${connectionId}/sync`, {});
}

export async function deleteBankConnection(connectionId: string): Promise<void> {
  return api.delete(`${ENDPOINT}/${connectionId}`);
}

/** @deprecated Use initBankConnection('tink', market, locale) instead */
export async function getTinkLink(market: string = 'FR', locale: string = 'en_US'): Promise<{ redirectUrl: string }> {
  const result = await initBankConnection('tink', market, locale);
  return { redirectUrl: result.redirectUrl };
}
