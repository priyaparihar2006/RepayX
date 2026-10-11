import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AutomationPage } from './Automation';
import { installFakeApi } from '../test/fakeApi';
import { renderAt } from '../test/render';

const KEY = 'operator-key-0123456789abcdefgh';

const health = {
  status: 'ok', mode: 'live', automation_paused: false,
  worker: { alive: true, worker_id: 'w1', hostname: 'srv-1', last_tick_at: '2026-10-10T10:30:00Z', jobs_processed: 42,
    last_error: null, stale_after_seconds: 60 },
  queue: { due_backlog: 0, oldest_due_lag_seconds: 0, processing: 0, dead_letter: 1, unknown_deliveries: 0 },
  providers: {
    whatsapp: { provider: 'meta_cloud', ready: true, problem: null, sandbox: false, official: true },
    sms: { provider: 'none', ready: false, problem: 'SMS_PROVIDER is not set.', sandbox: false, official: true },
    email: { provider: 'smtp', ready: true, problem: null, sandbox: false, official: true },
  },
  config_warnings: [], server_time: '2026-10-10T10:30:05Z',
};

const dashboard = {
  customers_total: 128,
  emis: { paid: 10, pending: 90, overdue: 25, partially_paid: 3, other: 0, total: 128, payment_claims_pending: 2 },
  reminders: { scheduled_open: 377, scheduled_today: 19, due_today_open: 12, upcoming_7_days: 140, by_status: {} },
  deliveries_by_channel: { whatsapp: { accepted: 5, delivered: 30, read: 11, failed: 2 }, sms: {}, email: { accepted: 4 } },
  failed_deliveries: 2, retry_attempts: 3,
  recent_replies: [{ id: 1, customer_id: 'CUST-1', customer_name: 'Rahul Sharma', channel: 'whatsapp', from: '+91******3210',
    content: 'I will pay tomorrow', intent: 'PROMISE_TO_PAY', created_at: '2026-10-10T09:00:00Z' }],
  followups_open: 1,
  followups: [{ id: 7, customer_id: 'CUST-1', customer_name: 'Rahul Sharma', loan_id: 'LN-1', kind: 'verify_payment',
    priority: 'high', reason: 'Customer says they have paid; verify before further reminders', due_at: null, created_at: '2026-10-10T09:00:00Z' }],
  last_import: { id: 3, filename: 'october.csv', status: 'completed', completed_at: '2026-10-09T10:00:00Z' },
  health, app_timezone: 'Asia/Kolkata',
};

const reminder = {
  id: 'job-1', emi_id: 1, customer_id: 'CUST-1', customer_name: 'Rahul Sharma', loan_id: 'LN-1', reminder_type: 'explicit',
  reminder_key: 'k', due_date: '2026-10-11', scheduled_at_utc: '2026-10-10T10:30:00Z', scheduled_at_local: '2026-10-10 16:00',
  run_at_utc: '2026-10-10T10:30:00Z', timezone: 'Asia/Kolkata', schedule_note: null, status: 'pending', attempt_count: 0,
  next_retry_at: null, outcome_reason: null, last_error: null, manual_override: false, channels: ['whatsapp', 'sms'],
  deliveries: [],
};

beforeEach(() => sessionStorage.clear());

describe('AutomationPage', () => {
  it('asks for an API key, signs in, and shows real dashboard numbers', async () => {
    installFakeApi({
      'GET /api/automation/me': { body: { success: true, name: 'omar', role: 'operator' } },
      'GET /api/automation/dashboard': { body: { success: true, ...dashboard } },
    });
    renderAt(<AutomationPage />, { url: '/automation', path: '/automation' });

    await userEvent.type(screen.getByLabelText('API key'), KEY);
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('377')).toBeInTheDocument();
    expect(screen.getByText('128')).toBeInTheDocument();
    expect(screen.getByText('Scheduler running')).toBeInTheDocument();
    expect(screen.getByText('SMS_PROVIDER is not set.')).toBeInTheDocument();
    expect(screen.getByText(/1 dead-lettered reminders/)).toBeInTheDocument();
    expect(screen.getByText('I will pay tomorrow')).toBeInTheDocument();
    expect(screen.getByText(/verify before further reminders/)).toBeInTheDocument();
    // Operators cannot pause automation.
    expect(screen.queryByRole('button', { name: /pause automation/i })).not.toBeInTheDocument();

    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${KEY}`);
    expect(sessionStorage.getItem('repayx.automationKey')).toBe(KEY);
  });

  it('shows the server message for a rejected key and keeps nothing stored', async () => {
    installFakeApi({
      'GET /api/automation/me': { status: 401, body: { success: false, error: { code: 'unauthorized', message: 'Invalid API key.' } } },
    });
    renderAt(<AutomationPage />, { url: '/automation', path: '/automation' });
    await userEvent.type(screen.getByLabelText('API key'), KEY);
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Invalid API key.')).toBeInTheDocument();
    expect(sessionStorage.getItem('repayx.automationKey')).toBeNull();
  });

  it('hides the import tab from viewers', async () => {
    sessionStorage.setItem('repayx.automationKey', KEY);
    installFakeApi({
      'GET /api/automation/me': { body: { success: true, name: 'vik', role: 'viewer' } },
      'GET /api/automation/dashboard': { body: { success: true, ...dashboard } },
    });
    renderAt(<AutomationPage />, { url: '/automation', path: '/automation' });
    expect(await screen.findByRole('button', { name: /reminders/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /import csv/i })).not.toBeInTheDocument();
  });

  it('lists reminders and cancels one with a reason', async () => {
    sessionStorage.setItem('repayx.automationKey', KEY);
    const calls = installFakeApi({
      'GET /api/automation/me': { body: { success: true, name: 'omar', role: 'operator' } },
      'GET /api/automation/dashboard': { body: { success: true, ...dashboard } },
      'GET /api/reminders': { body: { success: true, reminders: [reminder], pagination: { page: 1, page_size: 25, total: 1, total_pages: 1 } } },
      'GET /api/reminders/job-1': { body: { success: true, reminder, emi: { outstanding: '8500.00', due_date: '2026-10-11', payment_status: 'pending' }, customer: {}, history: [] } },
      'POST /api/reminders/job-1/cancel': { body: { success: true } },
    });
    renderAt(<AutomationPage />, { url: '/automation', path: '/automation' });
    await userEvent.click(await screen.findByRole('button', { name: /reminders/i }));
    await userEvent.click(await screen.findByText('Rahul Sharma'));
    expect(await screen.findByLabelText('Reminder details')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Cancel reason'), { target: { value: 'Customer paid at branch' } });
    await userEvent.click(screen.getByRole('button', { name: 'Cancel reminder' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.path === '/api/reminders/job-1/cancel')).toBe(true));
    const cancel = calls.find((c) => c.path === '/api/reminders/job-1/cancel');
    expect(cancel?.body).toEqual({ reason: 'Customer paid at branch' });
    expect(calls.find((c) => c.path === '/api/reminders')?.params.get('status')).toBe('pending,retry,processing');
  });
});
