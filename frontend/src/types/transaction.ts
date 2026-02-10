/**
 * Transaction domain types
 */

import { BaseEntity, PaginationParams, PaymentMethod, PaymentContext } from './api';

// ============================================
// Types
// ============================================

export type TransactionStatus = 'unconsidered' | 'unmatched' | 'matched' | 'ignored' | 'pending';

export interface Transaction extends BaseEntity {
  account_id: string | null;
  supplier_id: string | null;
  supplier_name?: string | null;
  source_type: string;
  source_id: string;
  amount: string;
  currency: string;
  transaction_date: string;
  booking_date: string | null;
  value_date: string | null;
  added_at: string;
  payment_method: PaymentMethod | null;
  payment_context: PaymentContext | null;
  external_reference: string | null;
  description_original: string | null;
  description_display: string | null;
  category: string | null;
  counterparty_name: string | null;
  counterparty_iban: string | null;
  counterparty_bic: string | null;
  status: TransactionStatus;
}

// ============================================
// Params & Requests
// ============================================

export interface TransactionsParams extends PaginationParams {
  status?: TransactionStatus;
  accountId?: string;
  supplierId?: string;
  paymentMethod?: PaymentMethod;
  paymentContext?: PaymentContext;
  search?: string;
  externalReference?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateTransactionRequest {
  sourceType?: string;
  sourceId: string;
  amount: number;
  currency?: string;
  transactionDate: string;
  bookingDate?: string;
  valueDate?: string;
  paymentMethod?: PaymentMethod;
  paymentContext?: PaymentContext;
  externalReference?: string;
  descriptionOriginal?: string;
  descriptionDisplay?: string;
  category?: string;
  counterpartyName?: string;
  counterpartyIban?: string;
  counterpartyBic?: string;
  status?: TransactionStatus;
  supplierId?: string;
  metadata?: Record<string, unknown>;
}
