/**
 * Type definitions for Invunion API
 * Version: 2.0.0
 */

import { Request } from 'express';

// ============================================
// BANKING PROVIDER TYPES
// ============================================

/**
 * Supported banking providers for Open Banking connections
 */
export type BankingProviderType = 'tink' | 'gocardless' | 'salt_edge' | 'plaid';

/**
 * Transaction source types - banking providers + manual sources + n8n
 */
export type TransactionSourceType = BankingProviderType | 'csv' | 'api' | 'manual' | 'n8n';

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

// ============================================
// AUTH TYPES
// ============================================

export interface AuthUser {
  uid: string;
  email: string | null;
  tenantId: string | null;
  role: 'admin' | 'user' | 'superadmin';
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
// DATABASE ENTITY TYPES
// ============================================

export interface Tenant {
  id: string;
  name: string;
  plan: 'starter' | 'pro' | 'business';
  status: 'active' | 'suspended' | 'cancelled';
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: string;
  tenant_id: string;
  firebase_uid: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: 'admin' | 'user';
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

/**
 * Supplier / Vendor (Fournisseur)
 */
export interface Supplier {
  id: string;
  tenant_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  tax_id: string | null;
  iban: string | null;
  bic: string | null;
  payment_terms_days: number;
  status: 'active' | 'inactive';
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

/**
 * Bank connection - supports multiple providers
 */
export interface BankConnection {
  id: string;
  tenant_id: string;
  user_id: string;
  provider: BankingProviderType;
  provider_connection_id: string | null;
  provider_user_id: string | null;
  status: 'pending' | 'active' | 'expired' | 'error';
  access_expires_at: Date | null;
  last_sync_at: Date | null;
  last_sync_error: string | null;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

/**
 * Bank account linked to a connection
 */
export interface BankAccount {
  id: string;
  connection_id: string;
  tenant_id: string;
  provider: BankingProviderType;
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
 * Transaction - unified from multiple sources
 */
export interface Transaction {
  id: string;
  tenant_id: string;
  account_id: string | null;
  supplier_id: string | null;
  
  // Source info
  source_type: TransactionSourceType;
  source_id: string;
  source_raw: Record<string, any> | null;
  
  // Amount & Currency
  amount: number;
  currency: string;
  
  // Dates
  transaction_date: Date;
  booking_date: Date | null;
  value_date: Date | null;
  added_at: Date;  // Date d'ajout dans l'application
  
  // Payment info
  payment_method: PaymentMethod | null;
  payment_context: PaymentContext | null;
  external_reference: string | null;  // Référence externe (sales order, etc.)
  
  // Descriptions
  description_original: string | null;  // Description originale de la banque
  description_display: string | null;   // Description affichée (modifiable)
  category: string | null;
  
  // Counterparty info
  counterparty_name: string | null;
  counterparty_iban: string | null;
  counterparty_bic: string | null;
  
  // Status
  status: TransactionStatus;
  
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

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

export interface InvoiceProvider {
  id: string;
  tenant_id: string;
  provider: string;
  api_key_ref: string | null;
  webhook_secret_ref: string | null;
  status: 'active' | 'inactive' | 'error';
  last_sync_at: Date | null;
  metadata: Record<string, any>;
  created_at: Date;
}

/**
 * Invoice - with recovery tracking
 */
export interface Invoice {
  id: string;
  tenant_id: string;
  provider_id: string | null;
  supplier_id: string | null;
  
  // Source info
  source_type: string;
  source_id: string;
  source_raw: Record<string, any> | null;
  
  // Invoice identification
  invoice_number: string | null;
  external_reference: string | null;  // Référence externe (PO number, etc.)
  
  // Dates
  invoice_date: Date | null;
  due_date: Date | null;
  payment_expected_date: Date | null;
  
  // Amounts
  amount_excl_vat: number;       // Montant HT
  vat_amount: number | null;     // Montant TVA
  amount_incl_vat: number;       // Montant TTC
  currency: string;
  
  // Payment info
  payment_method: PaymentMethod | null;
  
  // Contact info
  recipient_name: string | null;
  customer_name: string | null;  // Legacy
  customer_email: string | null;
  email_contact: string | null;
  phone_contact: string | null;
  
  // Description
  description: string | null;
  
  // Type & Status
  invoice_type: 'issued' | 'received';
  recovery_percent: number;  // 0-100, % of amount covered by matched transactions
  status: InvoiceStatus;
  
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface Match {
  id: string;
  tenant_id: string;
  transaction_id: string | null;
  transaction_type: 'bank' | 'crypto';
  crypto_transaction_id: string | null;
  invoice_id: string | null;
  matched_amount: number | null;  // Amount matched (can be partial)
  match_type: 'ai_auto' | 'manual' | 'rule' | 'n8n';
  confidence_score: number | null;
  ai_reasoning: string | null;
  matched_by: string | null;
  status: 'active' | 'cancelled';
  metadata: Record<string, any>;
  created_at: Date;
}

export interface Alert {
  id: string;
  tenant_id: string;
  user_id: string | null;
  alert_type: 'new_match' | 'low_confidence' | 'anomaly' | 'sync_error' | 'overdue_invoice';
  title: string;
  message: string | null;
  related_match_id: string | null;
  related_invoice_id: string | null;
  status: 'unread' | 'read' | 'dismissed';
  notification_sent: boolean;
  metadata: Record<string, any>;
  created_at: Date;
}

export interface ImportJob {
  id: string;
  tenant_id: string;
  user_id: string;
  file_name: string;
  file_type: 'transactions' | 'invoices';
  file_format: 'csv' | 'json';
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

export interface Report {
  id: string;
  tenant_id: string;
  report_type: string;
  period_start: Date | null;
  period_end: Date | null;
  data: Record<string, any>;
  metadata: Record<string, any>;
  generated_at: Date;
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

// ============================================
// BANKING PROVIDER SPECIFIC TYPES
// ============================================

/**
 * Normalized transaction from any banking provider
 * Used as intermediate format before storing in DB
 */
export interface NormalizedBankTransaction {
  externalId: string;
  transactionDate: Date;
  bookingDate: Date;
  valueDate?: Date;
  amount: number;
  currency: string;
  descriptionOriginal?: string;
  counterpartyName?: string;
  counterpartyIban?: string;
  counterpartyBic?: string;
  paymentMethod?: PaymentMethod;
  externalReference?: string;
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
