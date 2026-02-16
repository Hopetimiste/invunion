/**
 * Counterparties API service (v4.1)
 * Replaces Suppliers - unified clients + suppliers
 */

import { api, buildQueryString, PaginatedResponse } from './api/client';
import type {
  Counterparty,
  CounterpartiesParams,
  CreateCounterpartyRequest,
  UpdateCounterpartyRequest,
} from '@/types';

const BASE_URL = '/counterparties';

/**
 * List counterparties with filtering
 */
export async function getCounterparties(params?: CounterpartiesParams): Promise<PaginatedResponse<Counterparty>> {
  const query = buildQueryString(params || {});
  return api.get(`${BASE_URL}${query}`);
}

/**
 * Get counterparty by ID
 */
export async function getCounterparty(id: string): Promise<Counterparty> {
  return api.get(`${BASE_URL}/${id}`);
}

/**
 * Get all invoices for a counterparty
 */
export async function getCounterpartyInvoices(id: string): Promise<any[]> {
  return api.get(`${BASE_URL}/${id}/invoices`);
}

/**
 * Get all transactions for a counterparty
 */
export async function getCounterpartyTransactions(id: string): Promise<any[]> {
  return api.get(`${BASE_URL}/${id}/transactions`);
}

/**
 * Create new counterparty
 */
export async function createCounterparty(data: CreateCounterpartyRequest): Promise<Counterparty> {
  return api.post(BASE_URL, data as unknown as Record<string, unknown>);
}

/**
 * Update counterparty
 */
export async function updateCounterparty(id: string, data: UpdateCounterpartyRequest): Promise<Counterparty> {
  return api.patch(`${BASE_URL}/${id}`, data as unknown as Record<string, unknown>);
}

/**
 * Delete counterparty
 */
export async function deleteCounterparty(id: string): Promise<void> {
  return api.delete(`${BASE_URL}/${id}`);
}
