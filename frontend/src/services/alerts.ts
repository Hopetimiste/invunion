/**
 * Alerts service - handles notification alerts API calls
 */

import { api, buildQueryString, PaginatedResponse } from './api/client';

// ============================================
// Types
// ============================================

export type AlertType = 'new_match' | 'low_confidence' | 'anomaly' | 'sync_error';
export type AlertStatus = 'unread' | 'read' | 'dismissed';

export interface Alert {
  id: string;
  tenant_id: string;
  user_id: string | null;
  alert_type: AlertType;
  title: string;
  message: string | null;
  related_match_id: string | null;
  status: AlertStatus;
  notification_sent: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AlertsParams {
  page?: number;
  pageSize?: number;
  status?: AlertStatus;
  alertType?: AlertType;
}

// ============================================
// API Functions
// ============================================

const ENDPOINT = '/alerts';

export async function getAlerts(params?: AlertsParams): Promise<PaginatedResponse<Alert>> {
  const query = buildQueryString(params || {});
  return api.get(`${ENDPOINT}${query}`);
}

export async function updateAlert(id: string, status: AlertStatus): Promise<Alert> {
  return api.put(`${ENDPOINT}/${id}`, { status });
}

export async function markAllAlertsRead(): Promise<void> {
  return api.post(`${ENDPOINT}/mark-all-read`, {});
}

export async function getUnreadAlertCount(): Promise<{ count: number }> {
  return api.get(`${ENDPOINT}/unread-count`);
}
