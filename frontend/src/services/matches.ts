/**
 * Matches service - handles invoice/transaction matching API calls
 */

import { api, buildQueryString, PaginatedResponse } from './api/client';
import { PaginationParams } from '@/types/api';
import { InvoiceStatus } from '@/types/invoice';

// ============================================
// Types
// ============================================

export type MatchType = 'ai_auto' | 'manual' | 'rule' | 'n8n';
export type MatchStatus = 'active' | 'cancelled';

export interface Match {
  id: string;
  tenant_id: string;
  transaction_id: string | null;
  transaction_type: 'bank' | 'crypto';
  crypto_transaction_id: string | null;
  invoice_id: string | null;
  matched_amount: string;
  match_type: MatchType;
  confidence_score: string | null;
  ai_reasoning: string | null;
  matched_by: string | null;
  status: MatchStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  // Joined fields
  transaction_amount?: string;
  transaction_description?: string;
  transaction_date?: string;
  counterparty_name?: string;
  invoice_amount?: string;
  invoice_number?: string;
  recipient_name?: string;
  invoice_recovery_percent?: string;
}

export interface MatchesParams extends PaginationParams {
  status?: MatchStatus;
  matchType?: MatchType;
  minConfidence?: number;
  transactionId?: string;
  invoiceId?: string;
}

export interface CreateMatchRequest {
  transactionId: string;
  invoiceId: string;
  matchedAmount: number;
  confidenceScore?: number;
  notes?: string;
}

export interface CreateMatchResponse {
  match: Match;
  invoice: {
    id: string;
    recovery_percent: string;
    status: InvoiceStatus;
  };
}

export interface MatchStats {
  total_matches: string;
  ai_matches: string;
  manual_matches: string;
  avg_confidence: string | null;
  unmatched_transactions: string;
  unmatched_invoices: string;
}

// ============================================
// API Functions
// ============================================

const ENDPOINT = '/matches';

export async function getMatches(params?: MatchesParams): Promise<PaginatedResponse<Match>> {
  const query = buildQueryString(params || {});
  return api.get(`${ENDPOINT}${query}`);
}

export async function getMatch(id: string): Promise<Match> {
  return api.get(`${ENDPOINT}/${id}`);
}

export async function createManualMatch(data: CreateMatchRequest): Promise<CreateMatchResponse> {
  return api.post(`${ENDPOINT}/manual`, data as unknown as Record<string, unknown>);
}

export async function updateMatch(id: string, data: { status?: MatchStatus; matchedAmount?: number }): Promise<Match> {
  return api.put(`${ENDPOINT}/${id}`, data as unknown as Record<string, unknown>);
}

export async function deleteMatch(id: string): Promise<void> {
  return api.delete(`${ENDPOINT}/${id}`);
}

export async function getMatchStats(): Promise<MatchStats> {
  return api.get(`${ENDPOINT}/stats/summary`);
}
