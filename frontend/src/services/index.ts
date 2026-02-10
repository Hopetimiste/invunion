/**
 * Service layer exports
 * Clean interface for all API operations
 */

// Core client
export { api, apiRequest, buildQueryString, getAuthHeaders } from './api/client';
export type { PaginatedResponse, ApiResponse, RequestOptions } from './api/client';

// Domain services
export * from './auth';
export * from './transactions';
export * from './invoices';
export * from './suppliers';
export * from './matches';
export * from './alerts';
export * from './admin';
export * from './banking';
export * from './reports';
