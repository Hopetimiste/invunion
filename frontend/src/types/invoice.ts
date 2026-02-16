/**
 * Invoice domain types (v4.1)
 * Updated with kind, origin_invoice_id, settled_amount, open_amount
 */

import { BaseEntity, PaginationParams, PaymentMethod } from './api';

// ============================================
// Types
// ============================================

export type InvoiceStatus = 'unpaid' | 'partial' | 'paid' | 'cancelled' | 'overdue';
export type InvoiceType = 'issued' | 'received';
export type InvoiceKind = 'invoice' | 'credit_note';  // v4.1 NEW

export interface Invoice extends BaseEntity {
  provider_connection_id: string | null;  // v4.1 (replaces provider_id)
  counterparty_id: string | null;  // v4.1 (replaces supplier_id)
  counterparty_name_display?: string | null;  // v4.1 (from join)
  counterparty_type?: string | null;  // v4.1 (from join)
  origin_invoice_id: string | null;  // v4.1 NEW (for credit notes)
  origin_invoice_number?: string | null;  // v4.1 (from join)
  kind: InvoiceKind;  // v4.1 NEW
  source_type: string;
  source_id: string;
  invoice_number: string | null;
  external_reference: string | null;
  invoice_date: string | null;
  due_date: string | null;
  payment_expected_date: string | null;
  amount_excl_vat: string;
  vat_amount: string | null;
  amount_incl_vat: string;
  currency: string;
  payment_method: PaymentMethod | null;
  recipient_name: string | null;
  customer_name: string | null;
  customer_email: string | null;
  email_contact: string | null;
  phone_contact: string | null;
  description: string | null;
  invoice_type: InvoiceType;
  recovery_percent: string;
  settled_amount: string;  // v4.1 NEW
  open_amount: string;  // v4.1 NEW
  // Accounting (v4.1 NEW)
  ledger_account: string | null;
  analytic_1: string | null;
  analytic_2: string | null;
  status: InvoiceStatus;
}

// ============================================
// Params & Requests
// ============================================

export interface InvoicesParams extends PaginationParams {
  status?: InvoiceStatus;
  type?: InvoiceType;
  kind?: InvoiceKind;  // v4.1 NEW
  counterpartyId?: string;  // v4.1 (replaces supplierId)
  paymentMethod?: PaymentMethod;
  search?: string;
  externalReference?: string;
  minRecovery?: number;
  maxRecovery?: number;
  hasOpen?: 'true' | 'false';  // v4.1 NEW
  overdue?: 'true' | 'false';
  startDate?: string;
  endDate?: string;
}

export interface CreateInvoiceRequest {
  sourceType?: string;
  sourceId: string;
  providerConnectionId?: string;  // v4.1
  counterpartyId?: string;  // v4.1
  originInvoiceId?: string;  // v4.1 NEW
  kind?: InvoiceKind;  // v4.1 NEW
  invoiceNumber?: string;
  externalReference?: string;
  invoiceDate?: string;
  dueDate?: string;
  paymentExpectedDate?: string;
  amountExclVat: number;
  vatAmount?: number;
  amountInclVat: number;
  currency?: string;
  paymentMethod?: PaymentMethod;
  recipientName?: string;
  customerName?: string;
  customerEmail?: string;
  emailContact?: string;
  phoneContact?: string;
  description?: string;
  invoiceType?: InvoiceType;
  // Accounting (v4.1)
  ledgerAccount?: string;
  analytic1?: string;
  analytic2?: string;
  status?: InvoiceStatus;
  metadata?: Record<string, unknown>;
}

export interface UpdateInvoiceRequest {
  counterpartyId?: string;  // v4.1
  originInvoiceId?: string;  // v4.1
  kind?: InvoiceKind;  // v4.1
  externalReference?: string;
  dueDate?: string;
  paymentExpectedDate?: string;
  paymentMethod?: PaymentMethod;
  recipientName?: string;
  emailContact?: string;
  phoneContact?: string;
  description?: string;
  ledgerAccount?: string;  // v4.1
  analytic1?: string;  // v4.1
  analytic2?: string;  // v4.1
  status?: InvoiceStatus;
  metadata?: Record<string, unknown>;
}
