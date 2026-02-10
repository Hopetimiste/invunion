/**
 * Auth service - handles authentication API calls
 */

import { api } from './api/client';

// ============================================
// Types
// ============================================

export interface SignupTenantRequest {
  companyName: string;
  firstName?: string;
  lastName?: string;
}

export interface SignupTenantResponse {
  tenantId: string;
  userId: string;
  message: string;
}

export interface UserInfo {
  uid: string;
  email: string;
  tenantId: string;
  role: string;
  id?: string;
  first_name?: string;
  last_name?: string;
}

// ============================================
// API Functions
// ============================================

export async function signupTenant(data: SignupTenantRequest): Promise<SignupTenantResponse> {
  return api.post("/auth/signup-tenant", data as unknown as Record<string, unknown>);
}

export async function getCurrentUser(): Promise<UserInfo> {
  return api.get("/auth/me");
}
