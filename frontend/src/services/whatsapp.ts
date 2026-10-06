import { ApiError } from './api';

export interface WhatsAppStatus {
  ready: boolean; enabled: boolean; test_mode: boolean; missing: string[];
  webhook_configured: boolean; server_time: string;
}
export interface WhatsAppContact { name: string; phone: string; role: 'admin' | 'defaulter' | 'customer'; opted_in: boolean; test_recipient: boolean }
export interface WhatsAppTemplate { name: string; language: string; body: string; parameters: number }
export interface WhatsAppMessage {
  request_id: string; recipient: string; template: string; preview: string; created_at: string;
  delivery_status: string; provider_id: string | null; error: string | null; delivery_error: string | null;
}
export interface WhatsAppHistory {
  messages: WhatsAppMessage[];
  incoming: { provider_id: string; sender: string; text: string; received_at: string }[];
  server_time: string;
}
export interface WhatsAppSend {
  request_id: string; recipient: string; template: string; language: string;
  parameters: string[]; preview: string; confirm_send: true;
}

async function call<T>(path: string, key = '', body?: unknown, signal?: AbortSignal): Promise<T> {
  const base = import.meta.env.VITE_API_BASE_URL;
  if (!base) throw new ApiError('config', 'The API address is not configured.');
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abort);
  const timer = setTimeout(abort, 25_000);
  try {
    const response = await fetch(`${base.replace(/\/+$/, '')}/api/whatsapp/${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { ...(key ? { Authorization: `Bearer ${key}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok || data.success !== true) {
      throw new ApiError('server', typeof data.error?.message === 'string' ? data.error.message : 'WhatsApp request failed.');
    }
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (signal?.aborted) throw error;
    throw new ApiError('network', body
      ? 'Send result not confirmed. Refresh delivery history before trying again; the message may have been accepted.'
      : 'Cannot load WhatsApp data. Check the backend connection and try again.');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

export const whatsapp = {
  status: (signal?: AbortSignal) => call<WhatsAppStatus>('status', '', undefined, signal),
  contacts: (key: string) => call<{ contacts: WhatsAppContact[] }>('contacts', key),
  templates: (key: string) => call<{ templates: WhatsAppTemplate[] }>('templates', key),
  history: (key: string, signal?: AbortSignal) => call<WhatsAppHistory>('messages', key, undefined, signal),
  send: (key: string, data: WhatsAppSend) => call<{ status: string; provider_id: string | null }>('messages', key, data),
};
