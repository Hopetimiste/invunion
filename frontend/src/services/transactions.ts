/**
 * Transaction service - handles all transaction API calls (v4.1)
 */

import { api, buildQueryString, PaginatedResponse } from './api/client';
import { 
  Transaction, 
  TransactionsParams, 
  CreateTransactionRequest,
  UpdateTransactionRequest  // v4.1
} from '@/types/transaction';

const ENDPOINT = '/transactions';

export async function getTransactions(params?: TransactionsParams): Promise<PaginatedResponse<Transaction>> {
  const query = buildQueryString(params || {});
  return api.get(`${ENDPOINT}${query}`);
}

export async function getTransaction(id: string): Promise<Transaction> {
  return api.get(`${ENDPOINT}/${id}`);
}

export async function createTransaction(data: CreateTransactionRequest): Promise<Transaction> {
  return api.post(ENDPOINT, data as unknown as Record<string, unknown>);
}

export async function updateTransaction(id: string, data: UpdateTransactionRequest): Promise<Transaction> {
  return api.put(`${ENDPOINT}/${id}`, data as unknown as Record<string, unknown>);
}

export async function deleteTransaction(id: string): Promise<void> {
  return api.delete(`${ENDPOINT}/${id}`);
}

// Re-export types for convenience
export type { 
  Transaction, 
  TransactionsParams, 
  CreateTransactionRequest, 
  UpdateTransactionRequest 
};
