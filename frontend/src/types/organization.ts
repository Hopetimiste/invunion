/**
 * Organization domain types (v4.1)
 */

import { PaginationParams } from './api';

// ============================================
// Types
// ============================================

export type OrganizationPlan = 'starter' | 'pro' | 'enterprise';
export type OrganizationStatus = 'active' | 'suspended' | 'cancelled';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: OrganizationPlan;
  billing_email: string | null;
  max_tenants: number;
  max_users: number;
  settings: Record<string, unknown>;
  status: OrganizationStatus;
  created_at: string;
  updated_at: string;
}

// ============================================
// Params & Requests
// ============================================

export interface OrganizationsParams extends PaginationParams {
  status?: OrganizationStatus;
  plan?: OrganizationPlan;
  search?: string;
}

export interface CreateOrganizationRequest {
  name: string;
  slug?: string;
  plan?: OrganizationPlan;
  billing_email?: string;
  max_tenants?: number;
  max_users?: number;
  settings?: Record<string, unknown>;
  status?: OrganizationStatus;
}

export interface UpdateOrganizationRequest {
  name?: string;
  plan?: OrganizationPlan;
  billing_email?: string;
  max_tenants?: number;
  max_users?: number;
  settings?: Record<string, unknown>;
  status?: OrganizationStatus;
}
