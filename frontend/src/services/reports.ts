/**
 * Reports service - handles reporting and analytics API calls
 */

import { api, buildQueryString } from './api/client';

// ============================================
// Types
// ============================================

export interface ReconciliationReport {
  period: { start: string; end: string };
  transactions: {
    total: number;
    matched: number;
    unmatched: number;
    total_amount: string;
    matched_amount: string;
  };
  invoices: {
    total: number;
    paid: number;
    partial: number;
    unpaid: number;
    total_amount: string;
    recovered_amount: string;
  };
  match_rate: string;
  recovery_rate: string;
}

// ============================================
// API Functions
// ============================================

const ENDPOINT = '/reports';

export async function getReconciliationReport(startDate?: string, endDate?: string): Promise<ReconciliationReport> {
  const query = buildQueryString({ startDate, endDate });
  return api.get(`${ENDPOINT}/reconciliation${query}`);
}
