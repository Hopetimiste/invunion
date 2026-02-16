/**
 * Organizations API service (v4.1)
 */

import { api, buildQueryString, PaginatedResponse } from './api/client';
import type {
  Organization,
  OrganizationsParams,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
} from '@/types';

const BASE_URL = '/organizations';

/**
 * List all organizations (superadmin only)
 */
export async function getOrganizations(params?: OrganizationsParams): Promise<PaginatedResponse<Organization>> {
  const query = buildQueryString(params || {});
  return api.get(`${BASE_URL}${query}`);
}

/**
 * Get organization by ID
 */
export async function getOrganization(id: string): Promise<Organization> {
  return api.get(`${BASE_URL}/${id}`);
}

/**
 * Get all tenants for an organization
 */
export async function getOrganizationTenants(id: string): Promise<any[]> {
  return api.get(`${BASE_URL}/${id}/tenants`);
}

/**
 * Get all users for an organization
 */
export async function getOrganizationUsers(id: string): Promise<any[]> {
  return api.get(`${BASE_URL}/${id}/users`);
}

/**
 * Create new organization
 */
export async function createOrganization(data: CreateOrganizationRequest): Promise<Organization> {
  return api.post(BASE_URL, data as unknown as Record<string, unknown>);
}

/**
 * Update organization
 */
export async function updateOrganization(id: string, data: UpdateOrganizationRequest): Promise<Organization> {
  return api.patch(`${BASE_URL}/${id}`, data as unknown as Record<string, unknown>);
}

/**
 * Delete organization
 */
export async function deleteOrganization(id: string): Promise<void> {
  return api.delete(`${BASE_URL}/${id}`);
}
