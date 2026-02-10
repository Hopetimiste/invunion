/**
 * Core API client - framework agnostic HTTP layer
 * Easy to migrate to any backend (axios, fetch, etc.)
 */

import { getFirebaseAuth } from "@/lib/firebase";
import { getApiBaseUrl } from "@/lib/runtimeConfig";

// ============================================
// Types
// ============================================

export interface ApiResponse<T> {
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

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: Record<string, unknown> | string;
}

// ============================================
// Configuration
// ============================================

function getBaseUrl(): string {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new Error("API not configured");
  }
  return baseUrl.endsWith('/api/v1') ? baseUrl : `${baseUrl}/api/v1`;
}

// ============================================
// Auth - Can be swapped for different auth providers
// ============================================

export async function getAuthHeaders(): Promise<HeadersInit> {
  const auth = await getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }
  const token = await user.getIdToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// ============================================
// Generic API Request
// ============================================

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const baseUrl = getBaseUrl();
  const headers = await getAuthHeaders();
  
  const { body, ...restOptions } = options;
  
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...restOptions,
    headers: {
      ...headers,
      ...restOptions.headers,
    },
    body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  });

  const json = await response.json().catch(() => ({ success: false, error: "Invalid response" }));

  if (!response.ok || json.success === false) {
    throw new Error(json.error || json.message || `HTTP error ${response.status}`);
  }

  return json.data !== undefined ? json.data : json;
}

// ============================================
// Convenience Methods
// ============================================

export const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint),
  
  post: <T>(endpoint: string, body: Record<string, unknown>) => 
    apiRequest<T>(endpoint, { method: "POST", body }),
  
  put: <T>(endpoint: string, body: Record<string, unknown>) => 
    apiRequest<T>(endpoint, { method: "PUT", body }),
  
  patch: <T>(endpoint: string, body: Record<string, unknown>) => 
    apiRequest<T>(endpoint, { method: "PATCH", body }),
  
  delete: <T>(endpoint: string) => 
    apiRequest<T>(endpoint, { method: "DELETE" }),
};

// ============================================
// Query String Builder
// ============================================

export function buildQueryString<T extends object>(params: T): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });
  
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}
