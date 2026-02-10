/**
 * @deprecated This file is kept for backward compatibility.
 * Import from '@/services' instead for new code.
 * 
 * Migration guide:
 * - import { getTransactions } from '@/lib/api'
 * + import { getTransactions } from '@/services'
 */

// Re-export everything from the new services layer for backward compatibility
export * from '@/services';

// Re-export types for backward compatibility
export type {
  Transaction,
  TransactionsParams,
  CreateTransactionRequest,
  TransactionStatus,
} from '@/types/transaction';

export type {
  Invoice,
  InvoicesParams,
  CreateInvoiceRequest,
  InvoiceStatus,
  InvoiceType,
} from '@/types/invoice';

export type {
  PaymentMethod,
  PaymentContext,
  PaginatedResponse,
} from '@/types/api';
