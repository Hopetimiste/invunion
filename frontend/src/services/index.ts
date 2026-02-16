/**
 * Service layer exports (v4.1)
 * Clean interface for all API operations
 */

// Core client
export { api, apiRequest, buildQueryString, getAuthHeaders } from './api/client';
export type { PaginatedResponse, ApiResponse, RequestOptions } from './api/client';

// Domain services
export * from './auth';
export * from './transactions';
export * from './invoices';
export * from './counterparties';  // v4.1 (replaces suppliers)
export * from './matches';
export * from './organizations';  // v4.1 NEW
export * from './tenant-members';  // v4.1 NEW
export * from './admin';
export * from './banking';
