/**
 * Tenant Member domain types (v4.1)
 */

// ============================================
// Types
// ============================================

export type TenantRole = 'admin' | 'editor' | 'viewer';

export interface TenantMember {
  id: string;
  tenant_id: string;
  user_id: string;
  role: TenantRole;
  created_at: string;
  // Joined fields from user
  email?: string;
  first_name?: string | null;
  last_name?: string | null;
  org_role?: string;
}

// ============================================
// Requests
// ============================================

export interface AddTenantMemberRequest {
  user_id: string;
  role?: TenantRole;
}

export interface UpdateTenantMemberRequest {
  role: TenantRole;
}
