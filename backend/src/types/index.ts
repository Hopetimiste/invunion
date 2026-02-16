/**
 * Type definitions for Invunion API
 * Version: 4.1.0
 * Updated: 2026-02-13
 */

import { Request } from 'express';

// ============================================
// PROVIDER TYPES
// ============================================

/**
 * Supported banking providers for Open Banking connections
 */
export type BankingProviderType = 'tink' | 'gocardless' | 'salt_edge' | 'plaid';

/**
 * Supported invoice/accounting providers
 */
export type InvoiceProviderType = 'pennylane' | 'stripe' | 'xero' | 'quickbooks';

/**
 * Provider category
 */
export type ProviderCategory = 'banking' | 'invoicing' | 'accounting';

/**
 * Transaction source types - banking providers + manual sources + n8n
 */
export type TransactionSourceType = BankingProviderType | 'csv' | 'api' | 'manual' | 'n8n';

/**
 * Transaction direction (v4.1)
 */
export type TransactionDirection = 'in' | 'out';

/**
 * Transaction flow type (v4.1)
 */
export type TransactionFlowType = 
  | 'payment' 
  | 'refund' 
  | 'fee' 
  | 'chargeback' 
  | 'payout' 
  | 'direct_debit' 
  | 'transfer' 
  | 'adjustment' 
  | 'other';

/**
 * Payment methods
 */
export type PaymentMethod = 'card' | 'transfer' | 'direct_debit' | 'cash' | 'check' | 'crypto' | 'other';

/**
 * Payment context (CIT = Customer Initiated Transaction, MIT = Merchant Initiated Transaction)
 */
export type PaymentContext = 'CIT' | 'MIT' | 'recurring' | 'one_time' | 'refund' | 'other';

/**
 * Transaction status
 */
export type TransactionStatus = 'unconsidered' | 'unmatched' | 'matched' | 'ignored' | 'pending';

/**
 * Invoice status
 */
export type InvoiceStatus = 'unpaid' | 'partial' | 'paid' | 'cancelled' | 'overdue';

/**
 * Invoice kind (v4.1)
 */
export type InvoiceKind = 'invoice' | 'credit_note';

/**
 * Counterparty type (v4.1)
 */
export type CounterpartyType = 'client' | 'supplier' | 'both';

/**
 * Counterparty category (v4.1)
 */
export type CounterpartyCategory = 'individual' | 'professional' | 'governmental';

/**
 * Organization role (v4.1)
 */
export type OrganizationRole = 'owner' | 'admin' | 'member';

/**
 * Tenant role (v4.1)
 */
export type TenantRole = 'admin' | 'editor' | 'viewer';

// ============================================
// AUTH TYPES
// ============================================

export interface AuthUser {
  uid: string;
  email: string | null;
  organizationId: string | null;  // v4.1
  tenantId: string | null;
  orgRole: OrganizationRole | null;  // v4.1
  tenantRole: TenantRole | null;  // v4.1 (from tenant_members)
  role: 'admin' | 'user' | 'superadmin';  // legacy
  claims: Record<string, any>;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

// Declare module augmentation for Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Type guard to assert user is authenticated
export function assertAuthenticated(req: Request): asserts req is AuthenticatedRequest {
  if (!req.user) {
    throw new Error('User not authenticated');
  }
}

// ============================================
// DATABASE ENTITY TYPES - v4.1
// ============================================

/**
 * Organization (v4.1 - NEW)
 * Top-level entity grouping multiple tenants
 */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'starter' | 'pro' | 'enterprise';
  billing_email: string | null;
  max_tenants: number;
  max_users: number;
  settings: Record<string, any>;
  status: 'active' | 'suspended' | 'cancelled';
  created_at: Date;
  updated_at: Date;
}

/**
 * Tenant (v4.1 - MODIFIED)
 * Legal entity / subsidiary
 */
export interface Tenant {
  id: string;
  organization_id: string;  // v4.1 NEW
  name: string;
  legal_name: string | null;  // v4.1 NEW
  tax_id: string | null;  // v4.1 NEW
  country: string | null;  // v4.1 NEW (ISO 3166-1 alpha-2)
  timezone: string;  // v4.1 NEW
  plan: 'starter' | 'pro' | 'business';
  status: 'active' | 'suspended' | 'cancelled';
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

/**
 * User (v4.1 - MODIFIED)
 * User account (Firebase Auth integration)
 */
export interface User {
  id: string;
  organization_id: string;  // v4.1 NEW
  firebase_uid: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  org_role: OrganizationRole;  // v4.1 NEW
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

/**
 * Tenant Member (v4.1 - NEW)
 * User access to a specific tenant
 */
export interface TenantMember {
  id: string;
  tenant_id: string;
  user_id: string;
  role: TenantRole;
  created_at: Date;
}

/**
 * Counterparty (v4.1 - NEW, replaces Supplier + Client)
 * Unified third-party entity (client, supplier, or both)
 */
export interface Counterparty {
  id: string;
  tenant_id: string;
  // Type
  type: CounterpartyType;
  // Identity
  name: string;
  legal_name: string | null;
  vat_number: string | null;
  category: CounterpartyCategory;
  // External IDs (third-party's own identifiers)
  external_organization_id: string | null;
  external_entity_id: string | null;
  external_service_id: string | null;
  // Address
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  // Contacts
  emails: Array<{email: string; label?: string}>;
  phone: string | null;
  // References
  external_reference: string | null;
  internal_reference: string | null;
  // Payment
  payment_terms_days: number;
  iban: string | null;
  // Accounting
  ledger_accounts: Array<{code: string; label?: string}>;
  analytic_1: string | null;
  analytic_2: string | null;
  // Analytics (auto-calculated)
  payment_score: number;  // 0-100
  avg_payment_days: number;
  total_invoiced: number;
  total_paid: number;
  last_invoice_date: Date | null;
  last_payment_date: Date | null;
  invoice_count: number;
  outstanding_credit: number;  // v4.1
  // Status
  status: 'active' | 'inactive' | 'blocked' | 'prospect';
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

/**
 * Provider Connection (v4.1 - NEW, replaces BankConnection + InvoiceProvider)
 * Unified provider connection (banking, invoicing, accounting)
 */
export interface ProviderConnection {
  id: string;
  tenant_id: string;
  user_id: string | null;
  // Category & Provider
  category: ProviderCategory;
  provider: string;  // tink, gocardless, pennylane, stripe, etc.
  // Credentials (references to Secret Manager)
  provider_connection_id: string | null;
  provider_user_id: string | null;
  api_key_ref: string | null;
  webhook_secret_ref: string | null;
  // Lifecycle
  status: 'pending' | 'active' | 'expired' | 'error' | 'inactive';
  access_expires_at: Date | null;
  last_sync_at: Date | null;
  last_sync_error: string | null;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

/**
 * Bank Account (v4.1 - FK updated to provider_connections)
 */
export interface BankAccount {
  id: string;
  connection_id: string;  // FK → provider_connections
  tenant_id: string;
  provider: string;  // relaxed constraint, any provider
  provider_account_id: string;
  name: string;
  iban: string | null;
  bic: string | null;
  currency: string;
  account_type: string | null;
  balance: number | null;
  balance_updated_at: Date | null;
  bank_name: string | null;
  bank_logo_url: string | null;
  status: 'active' | 'inactive' | 'error';
  last_sync_at: Date | null;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

/**
 * Transaction (v4.1 - MODIFIED)
 * Bank transactions with direction + flow_type
 */
export interface Transaction {
  id: string;
  tenant_id: string;
  account_id: string | null;
  counterparty_id: string | null;  // v4.1 (replaces supplier_id)
  
  // Source info
  source_type: TransactionSourceType;
  source_id: string;
  source_raw: Record<string, any> | null;
  
  // Amount & Currency (v4.1 - amount always positive)
  amount: number;  // v4.1 - always positive
  direction: TransactionDirection;  // v4.1 NEW
  flow_type: TransactionFlowType;  // v4.1 NEW
  currency: string;
  
  // Dates
  transaction_date: Date;
  booking_date: Date | null;
  value_date: Date | null;
  added_at: Date;
  
  // Payment info
  payment_method: PaymentMethod | null;
  payment_context: PaymentContext | null;
  external_reference: string | null;
  
  // Remittance (v4.1 NEW)
  remittance_info: string | null;
  structured_reference: string | null;
  
  // Descriptions
  description_original: string | null;
  description_display: string | null;
  category: string | null;
  
  // Counterparty info
  counterparty_name: string | null;
  counterparty_name_normalized: string | null;  // v4.1 NEW
  counterparty_iban: string | null;
  counterparty_bic: string | null;
  
  // Accounting (v4.1 NEW)
  ledger_account: string | null;
  analytic_1: string | null;
  analytic_2: string | null;
  
  // Allocation tracking (v4.1 NEW)
  allocated_amount: number;
  remaining_amount: number;
  
  // Status
  status: TransactionStatus;
  
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

/**
 * Invoice (v4.1 - MODIFIED)
 * Invoices and credit notes
 */
export interface Invoice {
  id: string;
  tenant_id: string;
  provider_connection_id: string | null;  // v4.1 (replaces provider_id)
  counterparty_id: string | null;  // v4.1 (replaces supplier_id)
  origin_invoice_id: string | null;  // v4.1 NEW (for credit notes)
  kind: InvoiceKind;  // v4.1 NEW
  
  // Source info
  source_type: string;
  source_id: string;
  source_raw: Record<string, any> | null;
  
  // Invoice identification
  invoice_number: string | null;
  external_reference: string | null;
  
  // Dates
  invoice_date: Date | null;
  due_date: Date | null;
  payment_expected_date: Date | null;
  
  // Amounts
  amount_excl_vat: number;
  vat_amount: number | null;
  amount_incl_vat: number;
  currency: string;
  
  // Payment info
  payment_method: PaymentMethod | null;
  
  // Contact info
  recipient_name: string | null;
  customer_name: string | null;  // legacy
  customer_email: string | null;
  email_contact: string | null;
  phone_contact: string | null;
  
  // Description
  description: string | null;
  
  // Type & Status
  invoice_type: 'issued' | 'received';
  recovery_percent: number;  // 0-100
  settled_amount: number;  // v4.1 NEW
  open_amount: number;  // v4.1 NEW
  
  // Accounting (v4.1 NEW)
  ledger_account: string | null;
  analytic_1: string | null;
  analytic_2: string | null;
  
  status: InvoiceStatus;
  
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

/**
 * Match (v4.1 - MODIFIED)
 */
export interface Match {
  id: string;
  tenant_id: string;
  transaction_id: string | null;
  transaction_type: 'bank' | 'crypto';
  crypto_transaction_id: string | null;
  psp_event_id: string | null;  // v4.1 NEW
  invoice_id: string | null;
  invoice_line_id: string | null;  // v4.1 NEW (future-proof)
  matched_amount: number | null;
  match_type: 'ai_auto' | 'manual' | 'rule' | 'n8n';
  confidence_score: number | null;
  ai_reasoning: string | null;
  matched_by: string | null;
  status: 'active' | 'cancelled';
  metadata: Record<string, any>;
  created_at: Date;
}

/**
 * Invoice Allocation (v4.1 - NEW)
 * Credit note ↔ invoice compensation (netting)
 */
export interface InvoiceAllocation {
  id: string;
  tenant_id: string;
  credit_invoice_id: string;  // The credit note (kind = 'credit_note')
  target_invoice_id: string;  // The invoice to credit (kind = 'invoice')
  applied_amount: number;  // Amount applied (always positive)
  status: 'active' | 'cancelled';
  created_by: string | null;
  metadata: Record<string, any>;
  created_at: Date;
}

/**
 * Invoice Adjustment (v4.1 - NEW)
 * Bank fees, discounts, rounding, write-offs
 */
export interface InvoiceAdjustment {
  id: string;
  tenant_id: string;
  invoice_id: string;
  amount: number;  // Always positive
  direction: 'increase' | 'decrease';
  reason_code: 'bank_fee' | 'discount' | 'rounding' | 'write_off' | 'other';
  status: 'active' | 'cancelled';
  created_by: string | null;
  metadata: Record<string, any>;
  created_at: Date;
}

/**
 * Transaction Relation (v4.1 - NEW)
 * Links between transactions (chargebacks, reversals, refunds)
 */
export interface TransactionRelation {
  id: string;
  tenant_id: string;
  from_transaction_id: string;  // Original transaction
  to_transaction_id: string;  // Related transaction
  relation_type: 'reversal' | 'chargeback' | 'refund_of' | 'correction_of';
  amount: number | null;  // If partial, otherwise NULL
  metadata: Record<string, any>;
  created_at: Date;
}

/**
 * PSP Event (v4.1 - NEW, V2)
 * Unified PSP ledger (Stripe, Adyen, etc.)
 */
export interface PspEvent {
  id: string;
  tenant_id: string;
  provider_connection_id: string | null;
  event_type: 'charge' | 'refund' | 'fee' | 'payout' | 'chargeback' | 'adjustment';
  external_id: string;
  payment_id: string | null;
  amount: number;  // Always positive
  currency: string;
  occurred_at: Date | null;
  metadata: Record<string, any>;
  created_at: Date;
}

/**
 * Payout Bank Match (v4.1 - NEW, V2)
 * Links PSP payout → bank transaction
 */
export interface PayoutBankMatch {
  id: string;
  tenant_id: string;
  psp_payout_event_id: string;
  bank_transaction_id: string;
  matched_amount: number;  // Always positive
  match_type: 'auto' | 'manual';
  confidence_score: number | null;
  status: 'active' | 'cancelled';
  metadata: Record<string, any>;
  created_at: Date;
}

/**
 * Crypto Transaction
 */
export interface CryptoTransaction {
  id: string;
  tenant_id: string;
  wallet_address: string | null;
  chain: string | null;
  provider: string | null;
  tx_hash: string | null;
  amount: string;
  token_symbol: string | null;
  token_address: string | null;
  from_address: string | null;
  to_address: string | null;
  transaction_date: Date | null;
  gas_used: string | null;
  gas_price: string | null;
  status: 'unmatched' | 'matched' | 'ignored';
  raw_data: Record<string, any> | null;
  metadata: Record<string, any>;
  created_at: Date;
}

/**
 * Import Job
 */
export interface ImportJob {
  id: string;
  tenant_id: string;
  user_id: string;
  file_name: string;
  file_type: 'transactions' | 'invoices' | 'counterparties';
  file_format: 'csv' | 'xlsx' | 'json';
  total_rows: number | null;
  processed_rows: number;
  error_rows: number;
  errors: Record<string, any> | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  started_at: Date | null;
  completed_at: Date | null;
  metadata: Record<string, any>;
  created_at: Date;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

// ============================================
// PUB/SUB MESSAGE TYPES
// ============================================

export interface IngestMessage {
  type: 'banking_webhook' | 'csv_upload' | 'invoice_webhook' | 'api_push' | 'n8n_sync';
  tenantId: string;
  payload: {
    sourceType: TransactionSourceType;
    provider?: BankingProviderType;
    data: any[];
    importJobId?: string;
    connectionId?: string;
    accountId?: string;
  };
  timestamp: string;
  correlationId?: string;
}

export interface MatchingMessage {
  type: 'auto_match' | 'reprocess';
  tenantId: string;
  payload: {
    transactionIds?: string[];
    invoiceIds?: string[];
  };
  timestamp: string;
  correlationId?: string;
}

export interface AlertMessage {
  type: 'new_match' | 'sync_error' | 'anomaly' | 'overdue_invoice';
  tenantId: string;
  payload: {
    userId?: string;
    matchId?: string;
    invoiceId?: string;
    title: string;
    message: string;
  };
  timestamp: string;
}

// ============================================
// BANKING PROVIDER SPECIFIC TYPES
// ============================================

/**
 * Normalized transaction from any banking provider
 */
export interface NormalizedBankTransaction {
  externalId: string;
  transactionDate: Date;
  bookingDate: Date;
  valueDate?: Date;
  amount: number;  // Raw amount (can be negative)
  currency: string;
  descriptionOriginal?: string;
  counterpartyName?: string;
  counterpartyIban?: string;
  counterpartyBic?: string;
  paymentMethod?: PaymentMethod;
  externalReference?: string;
  remittanceInfo?: string;  // v4.1
  structuredReference?: string;  // v4.1
  category?: string;
  rawData: Record<string, any>;
}

/**
 * Provider-specific connection initialization response
 */
export interface BankingProviderInitResponse {
  provider: BankingProviderType;
  connectionId: string;
  redirectUrl: string;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * Provider-specific account info
 */
export interface BankingProviderAccount {
  providerId: string;
  iban?: string;
  bic?: string;
  name: string;
  currency: string;
  accountType?: string;
  balance?: number;
  bankName?: string;
  bankLogo?: string;
}
