/**
 * Tenant Members API service (v4.1)
 */

import { api } from './api/client';
import type {
  TenantMember,
  AddTenantMemberRequest,
  UpdateTenantMemberRequest,
} from '@/types';

const BASE_URL = '/tenant-members';

/**
 * List all members for current tenant
 */
export async function getTenantMembers(): Promise<TenantMember[]> {
  return api.get(BASE_URL);
}

/**
 * Add user to tenant
 */
export async function addTenantMember(data: AddTenantMemberRequest): Promise<TenantMember> {
  return api.post(BASE_URL, data as unknown as Record<string, unknown>);
}

/**
 * Update member role
 */
export async function updateTenantMember(id: string, data: UpdateTenantMemberRequest): Promise<TenantMember> {
  return api.patch(`${BASE_URL}/${id}`, data as unknown as Record<string, unknown>);
}

/**
 * Remove user from tenant
 */
export async function removeTenantMember(id: string): Promise<void> {
  return api.delete(`${BASE_URL}/${id}`);
}
