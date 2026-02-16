/**
 * Invoice service - handles all invoice API calls (v4.1)
 */

import { api, buildQueryString, PaginatedResponse } from './api/client';
import { 
  Invoice, 
  InvoicesParams, 
  CreateInvoiceRequest,
  UpdateInvoiceRequest  // v4.1
} from '@/types/invoice';

const ENDPOINT = '/invoices';

export async function getInvoices(params?: InvoicesParams): Promise<PaginatedResponse<Invoice>> {
  const query = buildQueryString(params || {});
  return api.get(`${ENDPOINT}${query}`);
}

export async function getInvoice(id: string): Promise<Invoice> {
  return api.get(`${ENDPOINT}/${id}`);
}

export async function createInvoice(data: CreateInvoiceRequest): Promise<Invoice> {
  return api.post(ENDPOINT, data as unknown as Record<string, unknown>);
}

export async function updateInvoice(id: string, data: UpdateInvoiceRequest): Promise<Invoice> {
  return api.put(`${ENDPOINT}/${id}`, data as unknown as Record<string, unknown>);
}

export async function deleteInvoice(id: string): Promise<void> {
  return api.delete(`${ENDPOINT}/${id}`);
}

// Re-export types for convenience
export type { 
  Invoice, 
  InvoicesParams, 
  CreateInvoiceRequest, 
  UpdateInvoiceRequest 
};
