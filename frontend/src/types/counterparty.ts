/**
 * Counterparty domain types (v4.1)
 * Replaces Supplier - unified clients + suppliers
 */

import { BaseEntity, PaginationParams } from './api';

// ============================================
// Types
// ============================================

export type CounterpartyType = 'client' | 'supplier' | 'both';
export type CounterpartyCategory = 'individual' | 'professional' | 'governmental';
export type CounterpartyStatus = 'active' | 'inactive' | 'blocked' | 'prospect';

export interface Counterparty extends BaseEntity {
  type: CounterpartyType;
  name: string;
  legal_name: string | null;
  vat_number: string | null;
  category: CounterpartyCategory;
  external_organization_id: string | null;
  external_entity_id: string | null;
  external_service_id: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  emails: Array<{ email: string; label?: string }>;
  phone: string | null;
  external_reference: string | null;
  internal_reference: string | null;
  payment_terms_days: number;
  iban: string | null;
  ledger_accounts: Array<{ code: string; label?: string }>;
  analytic_1: string | null;
  analytic_2: string | null;
  payment_score: number;
  avg_payment_days: number;
  total_invoiced: string;
  total_paid: string;
  last_invoice_date: string | null;
  last_payment_date: string | null;
  invoice_count: number;
  outstanding_credit: string;
  status: CounterpartyStatus;
}

// ============================================
// Params & Requests
// ============================================

export interface CounterpartiesParams extends PaginationParams {
  type?: CounterpartyType;
  status?: CounterpartyStatus;
  category?: CounterpartyCategory;
  search?: string;
}

export interface CreateCounterpartyRequest {
  type?: CounterpartyType;
  name: string;
  legal_name?: string;
  vat_number?: string;
  category?: CounterpartyCategory;
  external_organization_id?: string;
  external_entity_id?: string;
  external_service_id?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  emails?: Array<{ email: string; label?: string }>;
  phone?: string;
  external_reference?: string;
  internal_reference?: string;
  payment_terms_days?: number;
  iban?: string;
  ledger_accounts?: Array<{ code: string; label?: string }>;
  analytic_1?: string;
  analytic_2?: string;
  status?: CounterpartyStatus;
  metadata?: Record<string, unknown>;
}

export interface UpdateCounterpartyRequest {
  type?: CounterpartyType;
  name?: string;
  legal_name?: string;
  vat_number?: string;
  category?: CounterpartyCategory;
  external_organization_id?: string;
  external_entity_id?: string;
  external_service_id?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  emails?: Array<{ email: string; label?: string }>;
  phone?: string;
  external_reference?: string;
  internal_reference?: string;
  payment_terms_days?: number;
  iban?: string;
  ledger_accounts?: Array<{ code: string; label?: string }>;
  analytic_1?: string;
  analytic_2?: string;
  status?: CounterpartyStatus;
  metadata?: Record<string, unknown>;
}
