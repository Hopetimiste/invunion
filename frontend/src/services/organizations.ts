/**
 * Organizations API service (v4.1)
 */

import { apiClient } from './client';
import type {
  Organization,
  OrganizationsParams,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  PaginatedResponse,
} from '@/types';

const BASE_URL = '/organizations';

/**
 * List all organizations (superadmin only)
 */
export async function getOrganizations(params?: OrganizationsParams) {
  const response = await apiClient.get<PaginatedResponse<Organization>>(BASE_URL, { params });
  return response.data;
}

/**
 * Get organization by ID
 */
export async function getOrganization(id: string) {
  const response = await apiClient.get<{ success: boolean; data: Organization }>(`${BASE_URL}/${id}`);
  return response.data.data;
}

/**
 * Get all tenants for an organization
 */
export async function getOrganizationTenants(id: string) {
  const response = await apiClient.get<{ success: boolean; data: any[] }>(`${BASE_URL}/${id}/tenants`);
  return response.data.data;
}

/**
 * Get all users for an organization
 */
export async function getOrganizationUsers(id: string) {
  const response = await apiClient.get<{ success: boolean; data: any[] }>(`${BASE_URL}/${id}/users`);
  return response.data.data;
}

/**
 * Create new organization
 */
export async function createOrganization(data: CreateOrganizationRequest) {
  const response = await apiClient.post<{ success: boolean; data: Organization }>(BASE_URL, data);
  return response.data.data;
}

/**
 * Update organization
 */
export async function updateOrganization(id: string, data: UpdateOrganizationRequest) {
  const response = await apiClient.patch<{ success: boolean; data: Organization }>(`${BASE_URL}/${id}`, data);
  return response.data.data;
}

/**
 * Delete organization
 */
export async function deleteOrganization(id: string) {
  const response = await apiClient.delete<{ success: boolean; message: string }>(`${BASE_URL}/${id}`);
  return response.data;
}
