/**
 * useTransactions - Hook for managing transactions data
 */

import { useState, useCallback } from "react";
import { getTransactions, Transaction, TransactionsParams } from "@/services/transactions";
import { PaginatedResponse } from "@/services/api/client";

export interface UseTransactionsOptions {
  initialPageSize?: number;
}

export interface UseTransactionsReturn {
  transactions: Transaction[];
  loading: boolean;
  error: string;
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  setPage: (page: number) => void;
  fetch: (params?: TransactionsParams) => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

export function useTransactions({ initialPageSize = 20 }: UseTransactionsOptions = {}): UseTransactionsReturn {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(initialPageSize);
  const [hasMore, setHasMore] = useState(false);
  const [lastParams, setLastParams] = useState<TransactionsParams>({});

  const fetch = useCallback(async (params?: TransactionsParams) => {
    setError("");
    setLoading(true);
    
    const queryParams = { page, pageSize, ...params };
    setLastParams(queryParams);

    try {
      const response = await getTransactions(queryParams);
      setTransactions(response.items);
      setTotal(response.total);
      setHasMore(response.hasMore);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load transactions";
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
    transactions,
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
