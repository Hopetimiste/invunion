/**
 * Supplier service - handles supplier API calls
 */

import { api, buildQueryString, PaginatedResponse } from './api/client';
import { BaseEntity, PaginationParams } from '@/types/api';

// ============================================
// Types
// ============================================

export interface Supplier extends BaseEntity {
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  external_id: string | null;
}

export interface SuppliersParams extends Pick<PaginationParams, 'page' | 'pageSize'> {
  search?: string;
}

export interface CreateSupplierRequest {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  externalId?: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// API Functions
// ============================================

const ENDPOINT = '/suppliers';

export async function getSuppliers(params?: SuppliersParams): Promise<PaginatedResponse<Supplier>> {
  const query = buildQueryString(params || {});
  return api.get(`${ENDPOINT}${query}`);
}

export async function getSupplier(id: string): Promise<Supplier> {
  return api.get(`${ENDPOINT}/${id}`);
}

export async function createSupplier(data: CreateSupplierRequest): Promise<Supplier> {
  return api.post(ENDPOINT, data as unknown as Record<string, unknown>);
}

export async function updateSupplier(id: string, data: Partial<CreateSupplierRequest>): Promise<Supplier> {
  return api.put(`${ENDPOINT}/${id}`, data as unknown as Record<string, unknown>);
}

export async function deleteSupplier(id: string): Promise<void> {
  return api.delete(`${ENDPOINT}/${id}`);
}
