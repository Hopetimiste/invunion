/**
 * useInvoices - Hook for managing invoices data
 */

import { useState, useCallback } from "react";
import { getInvoices, Invoice, InvoicesParams } from "@/services/invoices";

export interface UseInvoicesOptions {
  initialPageSize?: number;
}

export interface UseInvoicesReturn {
  invoices: Invoice[];
  loading: boolean;
  error: string;
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  setPage: (page: number) => void;
  fetch: (params?: InvoicesParams) => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

export function useInvoices({ initialPageSize = 20 }: UseInvoicesOptions = {}): UseInvoicesReturn {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(initialPageSize);
  const [hasMore, setHasMore] = useState(false);
  const [lastParams, setLastParams] = useState<InvoicesParams>({});

  const fetch = useCallback(async (params?: InvoicesParams) => {
    setError("");
    setLoading(true);
    
    const queryParams = { page, pageSize, ...params };
    setLastParams(queryParams);

    try {
      const response = await getInvoices(queryParams);
      setInvoices(response.items);
      setTotal(response.total);
      setHasMore(response.hasMore);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load invoices";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  const refresh = useCallback(async () => {
    await fetch(lastParams);
  }, [fetch, lastParams]);

  const clearError = useCallback(() => setError(""), []);

  return {
    invoices,
    loading,
    error,
    total,
    page,
    pageSize,
    hasMore,
    setPage,
    fetch,
    refresh,
    clearError,
  };
}
