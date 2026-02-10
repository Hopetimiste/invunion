/**
 * Core API types - shared across all domains
 */

// ============================================
// Pagination
// ============================================

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================
// Shared Enums
// ============================================

export type PaymentMethod = 'card' | 'transfer' | 'direct_debit' | 'cash' | 'check' | 'crypto' | 'other';
export type PaymentContext = 'CIT' | 'MIT' | 'recurring' | 'one_time' | 'refund' | 'other';

// ============================================
// Base Entity
// ============================================

export interface BaseEntity {
  id: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
}
