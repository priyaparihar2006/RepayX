// Client for the reminder automation API. Requests carry the operator's API key as a
// bearer token. The key is kept in sessionStorage only (cleared when the tab closes).

import { ApiError, type ApiErrorKind } from './api';

const KEY_STORAGE = 'repayx.automationKey';
const TIMEOUT_MS = 30_000;

export function getAutomationKey(): string {
  try {
    return sessionStorage.getItem(KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}

export function setAutomationKey(key: string | null): void {
  try {
    if (key) sessionStorage.setItem(KEY_STORAGE, key);
    else sessionStorage.removeItem(KEY_STORAGE);
  } catch {
    /* storage unavailable: the key lives only for this page view */
  }
}

function baseUrl(): string {
  const value = import.meta.env.VITE_API_BASE_URL;
  if (!value) throw new ApiError('config', 'The API address is not configured. Set VITE_API_BASE_URL in .env.');
  return value.replace(/\/+$/, '');
}

export class AuthError extends ApiError {}

async function call<T>(path: string, init: { method?: string; json?: unknown; form?: FormData } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const key = getAutomationKey();
  if (key) headers.Authorization = `Bearer ${key}`;
  let body: BodyInit | undefined;
  if (init.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(init.json);
  } else if (init.form) {
    body = init.form;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${baseUrl()}${path}`, { method: init.method ?? 'GET', headers, body, signal: controller.signal });
  } catch {
    throw new ApiError(controller.signal.aborted ? 'timeout' : 'network',
      controller.signal.aborted ? 'The request timed out.' : 'Cannot reach the RepayX API. Check that the backend is running.');
  } finally {
    clearTimeout(timer);
  }
  let data: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      if (response.ok) return text as unknown as T;
    }
  }
  if (!response.ok) {
    const err = (data as { error?: { code?: string; message?: string } } | null)?.error ?? {};
    const message = err.message ?? 'The request could not be completed.';
    if (response.status === 401 || response.status === 403) {
      throw new AuthError('server', message, response.status, err.code);
    }
    const kind: ApiErrorKind = response.status === 404 ? 'not_found'
      : response.status === 422 || response.status === 409 || response.status === 413 || response.status === 415 ? 'validation'
      : response.status === 503 ? 'unavailable' : 'server';
    throw new ApiError(kind, message, response.status, err.code);
  }
  return data as T;
}

const qs = (params: Record<string, string | number | boolean | undefined | null>) => {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') s.set(k, String(v));
  });
  const out = s.toString();
  return out ? `?${out}` : '';
};

// ------------------------------------------------------------------ types

export type Channel = 'whatsapp' | 'sms' | 'email';
export interface Pagination { page: number; page_size: number; total: number; total_pages: number }

export interface Delivery {
  id: number; channel: Channel; status: string; recipient: string | null; provider: string | null;
  provider_message_id: string | null; attempt_count: number; next_retry_at: string | null;
  error_code: string | null; error_message: string | null; skip_reason: string | null;
  accepted_at: string | null; delivered_at: string | null; read_at: string | null; failed_at: string | null;
}

export interface Reminder {
  id: string; emi_id: number; customer_id: string; customer_name?: string | null; loan_id: string;
  reminder_type: 'explicit' | 'pre_due' | 'due_date' | 'overdue'; due_date: string;
  scheduled_at_utc: string; scheduled_at_local: string | null; run_at_utc: string; timezone: string;
  schedule_note: string | null; status: string; attempt_count: number; next_retry_at: string | null;
  outcome_reason: string | null; last_error: string | null; manual_override: boolean; channels: Channel[];
  deliveries?: Delivery[];
}

export interface Emi {
  emi_id: number; customer_id: string; customer_name?: string; loan_id: string; installment: string;
  emi_amount: string; amount_paid: string; outstanding: string; due_date: string; payment_status: string;
  payment_status_source: string; payment_status_updated_at: string; payment_claim_pending: boolean;
}

export interface ImportIssue { row: number; severity: 'error' | 'warning'; field: string | null; message: string }
export interface ImportSummary {
  import_id: number; import_type: string; status: string; total_rows: number; imported_rows: number;
  unchanged_rows: number; rejected_rows: number; warning_count: number; reminders_scheduled: number;
  reminders_updated: number; reminders_cancelled: number; reminders_skipped_past: number;
  issues: ImportIssue[]; issues_truncated: boolean;
}
export interface ImportRecord {
  id: number; import_type: string; filename: string; uploaded_by: string; status: string; total_rows: number;
  imported_rows: number; unchanged_rows: number; rejected_rows: number; warning_count: number;
  reminders_scheduled: number; created_at: string; completed_at: string | null;
}
export interface ImportPreview {
  headers: string[]; row_count: number; suggested_mapping: Record<string, string>; missing_required: string[];
  available_fields: string[]; required_fields: string[]; sample_rows: Record<string, string | null>[];
}

export interface Health {
  status: 'ok' | 'degraded'; mode: 'sandbox' | 'live'; automation_paused: boolean;
  worker: { alive: boolean; worker_id: string | null; hostname: string | null; last_tick_at: string | null;
    jobs_processed: number; last_error: string | null; stale_after_seconds: number };
  queue: { due_backlog: number; oldest_due_lag_seconds: number; processing: number; dead_letter: number; unknown_deliveries: number };
  providers: Record<Channel, { provider: string; ready: boolean; problem: string | null; sandbox: boolean; official: boolean }>;
  config_warnings: string[]; server_time: string;
}

export interface FollowUp {
  id: number; customer_id: string | null; customer_name: string | null; loan_id: string | null; kind: string;
  priority: 'low' | 'normal' | 'high'; reason: string; due_at: string | null; created_at: string;
  reminders_on_hold?: number;
}

export interface Dashboard {
  customers_total: number;
  emis: { paid: number; pending: number; overdue: number; partially_paid: number; other: number; total: number; payment_claims_pending: number };
  reminders: { scheduled_open: number; scheduled_today: number; due_today_open: number; upcoming_7_days: number; by_status: Record<string, number> };
  deliveries_by_channel: Record<Channel, Record<string, number>>;
  failed_deliveries: number; retry_attempts: number;
  recent_replies: { id: number; customer_id: string | null; customer_name: string | null; channel: Channel; from: string;
    content: string; intent: string | null; created_at: string }[];
  followups_open: number; followups: FollowUp[];
  last_import: { id: number; filename: string; status: string; completed_at: string | null } | null;
  health: Health; app_timezone: string;
}

export interface Policy {
  automation_paused: boolean; channels_enabled: Record<Channel, boolean>; channel_strategy: 'fallback' | 'all';
  channel_order: Channel[]; default_reminder_time: string; pre_due_days: number[]; due_date_reminder: boolean;
  overdue_days: number[]; overdue_repeat_every_days: number; overdue_max_reminders: number;
  contact_window_start: string; contact_window_end: string; contact_days: number[]; max_lateness_minutes: number;
  require_explicit_consent: boolean; suppress_on_payment_claim: boolean; auto_reply_enabled: boolean;
  auto_reply_channels: Channel[];
}

export interface Communication {
  id: number; customer_id: string | null; loan_id: string | null; channel: Channel; direction: 'inbound' | 'outbound';
  kind: string; identifier: string; subject: string | null; content: string; intent: string | null; status: string | null;
  created_at: string;
}

// ------------------------------------------------------------------ calls

export const automationApi = {
  me: () => call<{ name: string; role: 'viewer' | 'operator' | 'admin' }>('/api/automation/me'),
  dashboard: () => call<Dashboard>('/api/automation/dashboard'),
  health: () => call<Health>('/api/automation/health'),

  previewImport: (file: File, importType: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('import_type', importType);
    return call<ImportPreview>('/api/imports/preview', { method: 'POST', form });
  },
  importCsv: (file: File, importType: string, mapping: Record<string, string> | null, dryRun: boolean) => {
    const form = new FormData();
    form.append('file', file);
    form.append('import_type', importType);
    form.append('dry_run', String(dryRun));
    if (mapping) form.append('mapping', JSON.stringify(mapping));
    return call<ImportSummary>('/api/imports/csv', { method: 'POST', form });
  },
  imports: (page = 1) => call<{ imports: ImportRecord[]; pagination: Pagination }>(`/api/imports${qs({ page })}`),
  issuesCsvUrl: (id: number) => `${baseUrl()}/api/imports/${id}/issues.csv`,
  downloadIssues: (id: number) => call<string>(`/api/imports/${id}/issues.csv`),

  reminders: (params: { status?: string; reminder_type?: string; customer_id?: string; page?: number; page_size?: number }) =>
    call<{ reminders: Reminder[]; pagination: Pagination }>(`/api/reminders${qs(params)}`),
  reminder: (id: string) => call<{ reminder: Reminder; emi: Emi; customer: Record<string, unknown>;
    history: { actor: string; action: string; details: Record<string, unknown> | null; created_at: string }[] }>(`/api/reminders/${encodeURIComponent(id)}`),
  reschedule: (id: string, scheduledAtLocal: string) =>
    call(`/api/reminders/${encodeURIComponent(id)}`, { method: 'PATCH', json: { scheduled_at_local: scheduledAtLocal } }),
  cancel: (id: string, reason: string) =>
    call(`/api/reminders/${encodeURIComponent(id)}/cancel`, { method: 'POST', json: { reason } }),
  retry: (id: string) => call(`/api/reminders/${encodeURIComponent(id)}/retry`, { method: 'POST' }),

  emis: (params: { payment_status?: string; claim_pending?: boolean; search?: string; page?: number }) =>
    call<{ emis: Emi[]; pagination: Pagination }>(`/api/emis${qs(params)}`),
  updatePayment: (emiId: number, body: { payment_status: string; amount_paid?: string; reference?: string; note?: string }) =>
    call<{ emi: Emi; reminders_cancelled: number }>(`/api/emis/${emiId}/payment`, { method: 'PATCH', json: body }),
  rejectClaim: (emiId: number, note: string) => call(`/api/emis/${emiId}/claim/reject`, { method: 'POST', json: { note } }),

  settings: () => call<{ settings: Policy; app_timezone: string; mode: string }>('/api/automation/settings'),
  updateSettings: (changes: Partial<Policy>) =>
    call<{ settings: Policy; reminders_scheduled: number; reminders_updated: number; reminders_cancelled: number }>(
      '/api/automation/settings', { method: 'PATCH', json: changes }),
  pause: () => call('/api/automation/pause', { method: 'POST' }),
  resume: () => call('/api/automation/resume', { method: 'POST' }),

  communications: (params: { customer_id?: string; channel?: string; direction?: string; page?: number }) =>
    call<{ communications: Communication[]; pagination: Pagination }>(`/api/communications${qs(params)}`),
  followups: (status: 'open' | 'resolved' = 'open') =>
    call<{ followups: FollowUp[]; pagination: Pagination }>(`/api/followups${qs({ status })}`),
  resolveFollowup: (id: number, note: string, releaseHold: boolean) =>
    call(`/api/followups/${id}/resolve`, { method: 'POST', json: { note, release_hold: releaseHold } }),
};
