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

export interface UserLoanEmiRecord {
  customer_id: number;
  customer_name: string;
  phone: string;
  total_loan_amount: number;
  emi_paid_amount: number;
  emi_left_to_repay: number;
  monthly_emi: number;
  emis_paid_count: number;
  emis_remaining_count: number;
  total_tenure_months: number;
  interest_rate_pct: number;
  loan_disbursed_date: string;
  next_due_date: string;
  days_past_due: number;
  risk_score: number;
  risk_tier: 'High Risk' | 'Medium Risk' | 'Low Risk';
  payment_status: string;
  payment_link: string;
}

export interface LoanEmiDataResponse {
  success: boolean;
  users: UserLoanEmiRecord[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  summary: {
    total_users: number;
    total_loan_amount: number;
    total_emi_paid: number;
    total_emi_left_to_repay: number;
    high_risk_users: number;
    medium_risk_users: number;
  };
}

export interface WhatsAppDefaulter {
  customer_id: number;
  customer_name: string;
  phone: string;
  risk_tier: 'High Risk' | 'Medium Risk' | 'Low Risk';
  risk_score: number;
  unpaid_amount: number;
  late_days: number;
  total_loan_amount?: number;
  emi_paid_amount?: number;
  emis_paid_count?: number;
  emis_remaining_count?: number;
  last_due_date?: string;
  payment_link?: string;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  category: string;
  language?: string;
  body: string;
  variables?: string[];
}

export interface WhatsAppHistoryItem {
  id?: number;
  request_id: string;
  recipient: string;
  customer_id?: number | null;
  customer_name?: string | null;
  template_name?: string;
  message_preview: string;
  status: string;
  sent_at: string;
  error_message?: string | null;
}

export interface DemoContact {
  name: string;
  phone: string;
  customer_id: number;
  amount: string;
  late_days: number;
  total_loan?: number;
  emi_paid?: number;
  message?: string;
}

function apiUrl(path: string): string {
  const base = import.meta.env.VITE_API_BASE_URL;
  if (!base || path.startsWith('http')) return path;
  const cleanBase = base.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError('server', data.error || 'Request failed', response.status, data.type || 'error');
  }
  return data as T;
}

export interface ExtractedDefaulter {
  customer_id: number | string;
  customer_name: string;
  phone: string;
  total_loan_amount: number;
  emi_paid_amount: number;
  emi_left_to_repay: number;
  last_date_to_pay: string;
  parsed_due_date?: string;
  days_diff: number;
  urgency_status: 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING';
  payment_link: string;
  generated_message: string;
  status?: string;
  error?: string;
}

export interface UploadFileResponse {
  success: boolean;
  filename: string;
  extracted_count: number;
  records: ExtractedDefaulter[];
  auto_sent: boolean;
  dispatched_count: number;
  dispatched_results: any[];
}

export const whatsapp = {
  getStatus: (signal?: AbortSignal) => request<WhatsAppStatus>('/api/whatsapp/status', { signal }),
  generateQR: () => request<WhatsAppStatus>('/api/whatsapp/qr/generate', { method: 'POST' }),
  pairByCode: (phone: string = '+918650629360') =>
    request<{ success: boolean; pairing_code: string; phone: string }>('/api/whatsapp/pair-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    }),
  disconnect: () => request<{ success: boolean; status: string }>('/api/whatsapp/disconnect', { method: 'POST' }),
  getTemplates: () => request<{ success: boolean; templates: WhatsAppTemplate[] }>('/api/whatsapp/templates'),
  
  getLoanEmiData: (params?: { search?: string; risk_tier?: string; page?: number; page_size?: number }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.risk_tier) q.set('risk_tier', params.risk_tier);
    if (params?.page) q.set('page', String(params.page));
    if (params?.page_size) q.set('page_size', String(params.page_size));
    return request<LoanEmiDataResponse>(`/api/whatsapp/loan-emi-data?${q.toString()}`);
  },

  getDefaulters: (params?: { search?: string; risk_tier?: string; page?: number; page_size?: number }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.risk_tier) q.set('risk_tier', params.risk_tier);
    if (params?.page) q.set('page', String(params.page));
    if (params?.page_size) q.set('page_size', String(params.page_size));
    return request<any>(`/api/whatsapp/defaulters?${q.toString()}`);
  },

  sendMessage: (payload: { recipient: string; message: string; customer_id?: number; customer_name?: string; template_name?: string; request_id?: string }) =>
    request<any>('/api/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  autoDispatch: (payload: { target_tier: string; limit?: number }) =>
    request<any>('/api/whatsapp/ai-auto-outreach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  triggerAiAutoOutreach: (payload?: { target_tier?: string; limit?: number }) =>
    request<any>('/api/whatsapp/ai-auto-outreach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || { target_tier: 'high', limit: 25 }),
    }),

  aiChatReply: (payload: { phone: string; message: string }) =>
    request<{ success: boolean; auto_reply: boolean; reply_text: string; borrower: any }>('/api/whatsapp/ai-chat-reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  uploadDefaultersFile: async (file: File, autoSend = false): Promise<UploadFileResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(apiUrl(`/api/whatsapp/upload-defaulters-file?auto_send=${autoSend}`), {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiError('server', err.error || 'Failed to upload document', res.status);
    }
    return res.json();
  },

  dispatchExtracted: (records: ExtractedDefaulter[]) =>
    request<{ success: boolean; dispatched_count: number; dispatched: any[] }>('/api/whatsapp/dispatch-extracted', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records }),
    }),

  // CSV-Based Scheduling API Methods
  previewScheduledCsv: async (file: File, targetDate?: string, campaignId = 'default'): Promise<ScheduledPreviewResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const q = new URLSearchParams();
    if (targetDate) q.set('target_date', targetDate);
    if (campaignId) q.set('campaign_id', campaignId);

    const res = await fetch(apiUrl(`/api/whatsapp/scheduled/preview-csv?${q.toString()}`), {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiError('server', err.error || 'Failed to parse scheduled CSV', res.status);
    }
    return res.json();
  },

  confirmSchedule: (records: ScheduledRecord[], campaignId = 'default') =>
    request<{ success: boolean; saved_count: number; skipped_sent_count: number; stats: SchedulingSummary }>('/api/whatsapp/scheduled/confirm-schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records, campaign_id: campaignId }),
    }),

  getScheduledList: (params?: { campaign_id?: string; status?: string; page?: number; page_size?: number }) => {
    const q = new URLSearchParams();
    if (params?.campaign_id) q.set('campaign_id', params.campaign_id);
    if (params?.status) q.set('status', params.status);
    if (params?.page) q.set('page', String(params.page));
    if (params?.page_size) q.set('page_size', String(params.page_size));
    return request<{ success: boolean; total: number; page: number; page_size: number; total_pages: number; stats: SchedulingSummary; schedules: ScheduledRecord[] }>(
      `/api/whatsapp/scheduled/list?${q.toString()}`
    );
  },

  updateScheduleTime: (payload: { schedule_id: string; scheduled_message_time: string | null; target_date?: string; timezone?: string }) =>
    request<{ success: boolean; schedule_id: string; scheduled_message_time: string | null; timezone: string; scheduled_message_at: string | null; status: string }>(
      '/api/whatsapp/scheduled/update-time',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    ),

  processDueScheduledJobs: () =>
    request<{ processed_count: number; dispatched: any[]; skipped_count: number; wa_connected: boolean }>(
      '/api/whatsapp/scheduled/process-due',
      { method: 'POST' }
    ),

  getValidationReportDownloadUrl: (campaignId = 'default', format: 'csv' | 'json' = 'csv') =>
    apiUrl(`/api/whatsapp/scheduled/download-validation-report?campaign_id=${campaignId}&format=${format}`),

  getMessages: () => request<{ success: boolean; messages: WhatsAppHistoryItem[]; count?: number }>('/api/whatsapp/messages'),
  getContacts: () => request<{ success: boolean; contacts: DemoContact[] }>('/api/whatsapp/contacts'),
};

export interface ScheduledRecord {
  schedule_id: string;
  row_number?: number;
  customer_id: string;
  customer_name: string;
  phone_number: string;
  raw_phone?: string;
  loan_id?: string | null;
  unpaid_amount: number | null;
  due_date?: string | null;
  days_past_due?: number | null;
  payment_status?: string | null;
  probability_of_default?: number | null;
  risk_category?: string | null;
  payment_link?: string | null;
  scheduled_message_time: string | null;
  timezone: string;
  scheduled_message_at: string | null;
  target_date?: string;
  schedule_status: 'SCHEDULED' | 'UNSCHEDULED' | 'INVALID_TIME' | 'MISSED_SCHEDULE' | 'INVALID_ROW' | 'SENT' | 'FAILED' | 'PAUSED';
  status?: string;
  is_valid?: boolean;
  validation_errors?: string[];
  message_text: string;
  attempt_count?: number;
  sent_at?: string | null;
  last_error?: string | null;
}

export interface SchedulingSummary {
  total_imported: number;
  valid_records: number;
  invalid_records: number;
  scheduled_messages: number;
  unscheduled_customers: number;
  missed_schedules: number;
  invalid_time_records?: number;
  messages_sent: number;
  messages_failed: number;
  messages_paused?: number;
}

export interface ScheduledPreviewResponse {
  success: boolean;
  filename: string;
  campaign_id: string;
  summary: SchedulingSummary;
  records: ScheduledRecord[];
  validation_report: Array<{
    row_number: number;
    customer_id: string;
    customer_name: string;
    phone_number: string;
    scheduled_message_time: string | null;
    timezone: string;
    schedule_status: string;
    is_valid: boolean;
    errors: string;
  }>;
}
