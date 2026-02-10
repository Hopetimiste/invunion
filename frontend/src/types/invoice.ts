/**
 * Invoice domain types
 */

import { BaseEntity, PaginationParams, PaymentMethod } from './api';

// ============================================
// Types
// ============================================

export type InvoiceStatus = 'unpaid' | 'partial' | 'paid' | 'cancelled' | 'overdue';
export type InvoiceType = 'issued' | 'received';

export interface Invoice extends BaseEntity {
  provider_id: string | null;
  supplier_id: string | null;
  supplier_name?: string | null;
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
  status: InvoiceStatus;
}

// ============================================
// Params & Requests
// ============================================

export interface InvoicesParams extends PaginationParams {
  status?: InvoiceStatus;
  type?: InvoiceType;
  paymentMethod?: PaymentMethod;
  search?: string;
  externalReference?: string;
  recipientName?: string;
  supplierId?: string;
  minRecoveryPercent?: number;
  maxRecoveryPercent?: number;
  startDate?: string;
  endDate?: string;
}

export interface CreateInvoiceRequest {
  sourceType?: string;
  sourceId: string;
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
  status?: InvoiceStatus;
  supplierId?: string;
  metadata?: Record<string, unknown>;
}
