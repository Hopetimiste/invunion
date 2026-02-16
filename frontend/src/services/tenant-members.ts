/**
 * Tenant Members API service (v4.1)
 */

import { apiClient } from './client';
import type {
  TenantMember,
  AddTenantMemberRequest,
  UpdateTenantMemberRequest,
} from '@/types';

const BASE_URL = '/tenant-members';

/**
 * List all members for current tenant
 */
export async function getTenantMembers() {
  const response = await apiClient.get<{ success: boolean; data: TenantMember[] }>(BASE_URL);
  return response.data.data;
}

/**
 * Add user to tenant
 */
export async function addTenantMember(data: AddTenantMemberRequest) {
  const response = await apiClient.post<{ success: boolean; data: TenantMember }>(BASE_URL, data);
  return response.data.data;
}

/**
 * Update member role
 */
export async function updateTenantMember(id: string, data: UpdateTenantMemberRequest) {
  const response = await apiClient.patch<{ success: boolean; data: TenantMember }>(`${BASE_URL}/${id}`, data);
  return response.data.data;
}

/**
 * Remove user from tenant
 */
export async function removeTenantMember(id: string) {
  const response = await apiClient.delete<{ success: boolean; message: string }>(`${BASE_URL}/${id}`);
  return response.data;
}
