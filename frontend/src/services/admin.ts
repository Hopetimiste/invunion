/**
 * Admin service - handles admin-only API calls
 */

import { api, buildQueryString, PaginatedResponse } from './api/client';

// ============================================
// Types
// ============================================

export interface AdminSummary {
  total_tenants: string;
  active_tenants: string;
  connected_connections: string;
  sync_failures_last_24h: string;
  transactions_last_24h: string;
  matches_last_24h: string;
}

export interface AdminTenant {
  id: string;
  name: string;
  plan: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_count?: string;
  transaction_count?: string;
}

// Legacy Tenant type for compatibility
export interface Tenant {
  id: string;
  companyName: string;
  country: string;
  status: "active" | "disabled";
  createdAt: string;
  lastSuccessSyncAt: string | null;
}

export interface AdminTenantsParams {
  page?: number;
  pageSize?: number;
  sortOrder?: 'asc' | 'desc';
}

export interface AdminLog {
  timestamp: string;
  severity: string;
  textPayload?: string;
  jsonPayload?: Record<string, unknown>;
  insertId?: string;
}

export interface AdminLogsParams {
  limit?: number;
  pageToken?: string;
  severity?: string;
  q?: string;
  from?: string;
  to?: string;
}

export interface AdminLogsResponse {
  logs: AdminLog[];
  nextPageToken?: string | null;
}

// ============================================
// API Functions
// ============================================

const ENDPOINT = '/admin';

export async function getAdminSummary(): Promise<AdminSummary> {
  return api.get(`${ENDPOINT}/summary`);
}

export async function getAdminTenants(params?: AdminTenantsParams): Promise<Tenant[]> {
  const query = buildQueryString(params || {});
  const response = await api.get<PaginatedResponse<AdminTenant>>(`${ENDPOINT}/tenants${query}`);
  
  // Transform AdminTenant to legacy Tenant format for compatibility
  return response.items.map(t => ({
    id: t.id,
    companyName: t.name,
    country: 'N/A',
    status: t.status === 'active' ? 'active' : 'disabled',
    createdAt: t.created_at,
    lastSuccessSyncAt: null,
  })) as Tenant[];
}

export async function disableTenant(tenantId: string): Promise<void> {
  return api.post(`${ENDPOINT}/tenants/${tenantId}/disable`, {});
}

export async function enableTenant(tenantId: string): Promise<void> {
  return api.post(`${ENDPOINT}/tenants/${tenantId}/enable`, {});
}

export async function getAdminLogs(params?: AdminLogsParams): Promise<AdminLogsResponse> {
  const query = buildQueryString(params || {});
  return api.get(`${ENDPOINT}/logs${query}`);
}

/** @deprecated Resync is handled via bank connections now */
export async function resyncTenant(_tenantId: string): Promise<void> {
  console.warn('resyncTenant is deprecated - use syncBankConnection instead');
  return Promise.resolve();
}
