/**
 * Transaction domain types (v4.1)
 * Updated with direction, flow_type, accounting fields
 */

import { BaseEntity, PaginationParams, PaymentMethod, PaymentContext } from './api';

// ============================================
// Types
// ============================================

export type TransactionStatus = 'unconsidered' | 'unmatched' | 'matched' | 'ignored' | 'pending';
export type TransactionDirection = 'in' | 'out';
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

export interface Transaction extends BaseEntity {
  account_id: string | null;
  counterparty_id: string | null;  // v4.1 (replaces supplier_id)
  counterparty_name_display?: string | null;  // v4.1 (from join)
  counterparty_type?: string | null;  // v4.1 (from join)
  source_type: string;
  source_id: string;
  // Amount (v4.1: always positive)
  amount: string;
  direction: TransactionDirection;  // v4.1 NEW
  flow_type: TransactionFlowType;  // v4.1 NEW
  currency: string;
  // Dates
  transaction_date: string;
  booking_date: string | null;
  value_date: string | null;
  added_at: string;
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
  allocated_amount: string;
  remaining_amount: string;
  // Status
  status: TransactionStatus;
}

// ============================================
// Params & Requests
// ============================================

export interface TransactionsParams extends PaginationParams {
  status?: TransactionStatus;
  direction?: TransactionDirection;  // v4.1 NEW
  flowType?: TransactionFlowType;  // v4.1 NEW
  accountId?: string;
  counterpartyId?: string;  // v4.1 (replaces supplierId)
  paymentMethod?: PaymentMethod;
  paymentContext?: PaymentContext;
  search?: string;
  externalReference?: string;
  hasRemaining?: 'true' | 'false';  // v4.1 NEW
  startDate?: string;
  endDate?: string;
}

export interface CreateTransactionRequest {
  sourceType?: string;
  sourceId: string;
  accountId?: string;
  counterpartyId?: string;  // v4.1
  // Amount (v4.1: always positive + direction)
  amount: number;
  direction: TransactionDirection;  // v4.1 NEW (required)
  flowType?: TransactionFlowType;  // v4.1 NEW
  currency?: string;
  transactionDate: string;
  bookingDate?: string;
  valueDate?: string;
  paymentMethod?: PaymentMethod;
  paymentContext?: PaymentContext;
  externalReference?: string;
  // Remittance (v4.1)
  remittanceInfo?: string;
  structuredReference?: string;
  descriptionOriginal?: string;
  descriptionDisplay?: string;
  category?: string;
  counterpartyName?: string;
  counterpartyIban?: string;
  counterpartyBic?: string;
  // Accounting (v4.1)
  ledgerAccount?: string;
  analytic1?: string;
  analytic2?: string;
  status?: TransactionStatus;
  metadata?: Record<string, unknown>;
}

export interface UpdateTransactionRequest {
  counterpartyId?: string;  // v4.1
  direction?: TransactionDirection;  // v4.1
  flowType?: TransactionFlowType;  // v4.1
  paymentMethod?: PaymentMethod;
  paymentContext?: PaymentContext;
  externalReference?: string;
  remittanceInfo?: string;  // v4.1
  structuredReference?: string;  // v4.1
  descriptionDisplay?: string;
  category?: string;
  ledgerAccount?: string;  // v4.1
  analytic1?: string;  // v4.1
  analytic2?: string;  // v4.1
  status?: TransactionStatus;
  metadata?: Record<string, unknown>;
}
