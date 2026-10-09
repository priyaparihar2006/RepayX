import { ApiError } from './api';

export interface WhatsAppSession {
  phone_number: string;
  user_name: string;
  connected_at: string;
  device: string;
  battery_level?: number;
}

export interface WhatsAppStats {
  total_sent: number;
  total_failed: number;
  total_pending: number;
}

export interface WhatsAppStatus {
  success: boolean;
  enabled: boolean;
  ready: boolean;
  connected: boolean;
  status: 'DISCONNECTED' | 'SCAN_QR_CODE' | 'CONNECTING' | 'CONNECTED' | 'OFFLINE' | 'ERROR';
  error_message?: string | null;
  expected_sender?: string;
  qr_code?: string;
  qr_expires_in?: number;
  session_info?: WhatsAppSession | null;
  stats: WhatsAppStats;
  server_time: string;
}

export interface WhatsAppDefaulter {
  customer_id: number;
  customer_name: string;
  phone: string;
  risk_tier: 'High Risk' | 'Medium Risk' | 'Low Risk';
  risk_score: number;
  unpaid_amount: number;
  late_days: number;
  last_due_date: string;
  opted_in: boolean;
  recommended_action: string;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  category: string;
  language: string;
  body: string;
  variables: string[];
}

export interface WhatsAppHistoryItem {
  id: number;
  request_id: string;
  recipient: string;
  customer_id?: number | null;
  customer_name?: string | null;
  template_name?: string;
  message_preview: string;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'pending' | 'sending' | 'unknown' | 'simulated';
  sent_at: string;
  error_message?: string | null;
}

export interface DefaultersResponse {
  success: boolean;
  defaulters: WhatsAppDefaulter[];
  total: number;
  summary: {
    total_defaulters: number;
    high_risk_count: number;
    medium_risk_count: number;
    total_unpaid_amount: number;
  };
}

export interface AutoDispatchPayload {
  target_tier: 'all' | 'high' | 'medium' | 'unpaid_only';
  template_id: string;
  custom_body?: string;
  customer_ids?: number[];
  limit?: number;
}

export interface AutoDispatchResponse {
  success: boolean;
  dispatched: number;
  failed: number;
  target_tier: string;
  total_targets: number;
  message: string;
}

export interface DemoContact {
  name: string;
  phone: string;
  customer_id: number;
  amount: string;
  late_days: number;
  sample_data: boolean;
  message: string;
}

async function call<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abort);
  const timer = setTimeout(abort, 25_000);

  try {
    const url = `${base.replace(/\/+$/, '')}/api/whatsapp/${path}`;
    const response = await fetch(url, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    const data = await response.json();
    if (!response.ok || data.success !== true) {
      const msg = typeof data.detail === 'string'
        ? data.detail
        : (typeof data.error?.message === 'string' ? data.error.message : 'WhatsApp request failed.');
      throw new ApiError('server', msg);
    }
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (signal?.aborted) throw error;
    throw new ApiError('network', 'Cannot connect to WhatsApp service. Please ensure the backend is active.');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

export const whatsapp = {
  getContacts: () => call<{ success: boolean; contacts: DemoContact[] }>('contacts'),
  pairByCode: () => call<{ success: boolean; pairing_code: string }>('pair-code', { phone: '+918650629360' }),
  getStatus: (signal?: AbortSignal) => call<WhatsAppStatus>('status', undefined, signal),
  generateQR: () => call<{ success: boolean; qr_code: string; expires_in: number; status: string }>('qr/generate', {}),
  pairDevice: (payload?: { phone_number?: string; user_name?: string }) =>
    call<{ success: boolean; paired: boolean; session: WhatsAppSession; status: string }>('qr/pair', payload || {}),
  disconnect: () => call<{ success: boolean; status: string }>('disconnect', {}),
  getDefaulters: (params?: { tier?: string; limit?: number; offset?: number; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.tier) q.set('tier', params.tier);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.offset) q.set('offset', String(params.offset));
    if (params?.search) q.set('search', params.search);
    const queryStr = q.toString();
    return call<DefaultersResponse>(`defaulters${queryStr ? `?${queryStr}` : ''}`);
  },
  getTemplates: () => call<{ success: boolean; templates: WhatsAppTemplate[] }>('templates'),
  sendMessage: (payload: { recipient: string; message: string; customer_id?: number; customer_name?: string; template_name?: string; request_id?: string }) =>
    call<{ success: boolean; message_id: string; status: string; recipient: string; error_message?: string }>('send', payload),
  autoDispatch: (payload: AutoDispatchPayload) => call<AutoDispatchResponse>('auto-dispatch', payload),
  getMessages: (limit = 50) => call<{ success: boolean; messages: WhatsAppHistoryItem[]; count: number }>(`messages?limit=${limit}`),
};
