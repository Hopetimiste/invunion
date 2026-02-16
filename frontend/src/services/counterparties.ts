/**
 * Counterparties API service (v4.1)
 * Replaces Suppliers - unified clients + suppliers
 */

import { apiClient } from './client';
import type {
  Counterparty,
  CounterpartiesParams,
  CreateCounterpartyRequest,
  UpdateCounterpartyRequest,
  PaginatedResponse,
} from '@/types';

const BASE_URL = '/counterparties';

/**
 * List counterparties with filtering
 */
export async function getCounterparties(params?: CounterpartiesParams) {
  const response = await apiClient.get<PaginatedResponse<Counterparty>>(BASE_URL, { params });
  return response.data;
}

/**
 * Get counterparty by ID
 */
export async function getCounterparty(id: string) {
  const response = await apiClient.get<{ success: boolean; data: Counterparty }>(`${BASE_URL}/${id}`);
  return response.data.data;
}

/**
 * Get all invoices for a counterparty
 */
export async function getCounterpartyInvoices(id: string) {
  const response = await apiClient.get<{ success: boolean; data: any[] }>(`${BASE_URL}/${id}/invoices`);
  return response.data.data;
}

/**
 * Get all transactions for a counterparty
 */
export async function getCounterpartyTransactions(id: string) {
  const response = await apiClient.get<{ success: boolean; data: any[] }>(`${BASE_URL}/${id}/transactions`);
  return response.data.data;
}

/**
 * Create new counterparty
 */
export async function createCounterparty(data: CreateCounterpartyRequest) {
  const response = await apiClient.post<{ success: boolean; data: Counterparty }>(BASE_URL, data);
  return response.data.data;
}

/**
 * Update counterparty
 */
export async function updateCounterparty(id: string, data: UpdateCounterpartyRequest) {
  const response = await apiClient.patch<{ success: boolean; data: Counterparty }>(`${BASE_URL}/${id}`, data);
  return response.data.data;
}

/**
 * Delete counterparty
 */
export async function deleteCounterparty(id: string) {
  const response = await apiClient.delete<{ success: boolean; message: string }>(`${BASE_URL}/${id}`);
  return response.data;
}
