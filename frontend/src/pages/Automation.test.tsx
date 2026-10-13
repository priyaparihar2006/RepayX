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
  it('explains exact CSV scheduling and offers a sample download', async () => {
    sessionStorage.setItem('repayx.automationKey', KEY);
    installFakeApi({
      'GET /api/automation/me': { body: { success: true, name: 'omar', role: 'operator' } },
      'GET /api/automation/dashboard': { body: { success: true, ...dashboard } },
      'GET /api/imports': { body: { success: true, imports: [], pagination: { page: 1, total_pages: 1 } } },
    });
    renderAt(<AutomationPage />, { url: '/automation', path: '/automation' });
    await userEvent.click(await screen.findByRole('button', { name: /import csv/i }));
    expect(await screen.findByRole('button', { name: 'Download sample CSV' })).toBeInTheDocument();
    expect(screen.getByText(/YYYY-MM-DD HH:MM:SS/)).toHaveTextContent('browser closed');
  });

  it('shows backend simulated status and scheduled IST time', async () => {
    sessionStorage.setItem('repayx.automationKey', KEY);
    installFakeApi({
      'GET /api/automation/me': { body: { success: true, name: 'omar', role: 'operator' } },
      'GET /api/automation/dashboard': { body: { success: true, ...dashboard } },
      'GET /api/reminders': { body: { success: true,
        reminders: [{ ...reminder, status: 'completed', display_status: 'simulated' }],
        pagination: { page: 1, page_size: 25, total: 1, total_pages: 1 } } },
    });
    renderAt(<AutomationPage />, { url: '/automation', path: '/automation' });
    await userEvent.click(await screen.findByRole('button', { name: /reminders/i }));
    expect(await screen.findByText('simulated')).toBeInTheDocument();
    expect(screen.getByText('Scheduled (IST)')).toBeInTheDocument();
    expect(screen.getByText(/10 Oct 2026.*4:00:00 pm IST/i)).toBeInTheDocument();
  });
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

 describe('CSV upload flow', () => {
  const preview = { success: true, headers: ['customer_id'], row_count: 1, suggested_mapping: { customer_id: 'customer_id' }, missing_required: [], available_fields: ['customer_id'], required_fields: ['customer_id'], sample_rows: [{ customer_id: 'C1' }] };
  const summary = { success: true, import_id: 42, import_type: 'emi_reminders', status: 'completed', total_rows: 1, imported_rows: 1, unchanged_rows: 0, rejected_rows: 0, warning_count: 0, reminders_scheduled: 2, reminders_updated: 0, reminders_cancelled: 0, reminders_skipped_past: 0, issues: [], issues_truncated: false };
  it('previews only on drop, validates separately, imports with unchanged payload and refreshes history', async () => {
    sessionStorage.setItem('repayx.automationKey', KEY);
    let imported = false;
    const calls = installFakeApi({
      'GET /api/automation/me': { body: { success: true, name: 'omar', role: 'operator' } },
      'GET /api/automation/dashboard': { body: { success: true, ...dashboard } },
      'GET /api/imports': () => ({ body: { success: true, imports: imported ? [{ ...summary, id: 42, filename: 'history.csv', created_at: '2026-10-13T00:00:00Z' }] : [], pagination: {} } }),
      'POST /api/imports/preview': { body: preview },
      'POST /api/imports/csv': ({ body }) => {
        const form = body as FormData;
        expect(form.get('import_type')).toBe('emi_reminders');
        expect(form.get('mapping')).toBe(JSON.stringify({ customer_id: 'customer_id' }));
        expect((form.get('file') as File).name).toBe('test.csv');
        const dry = form.get('dry_run') === 'true';
        if (!dry) imported = true;
        return { body: { ...summary, status: dry ? 'dry_run' : 'completed' } };
      },
    });
    renderAt(<AutomationPage />, { url: '/automation', path: '/automation' });
    await userEvent.click(await screen.findByRole('button', { name: /Import CSV/i }));
    fireEvent.drop(screen.getByRole('button', { name: 'Browse Files' }), { dataTransfer: { files: [new File(['customer_id\nC1'], 'test.csv')] } });
    await screen.findByRole('button', { name: 'Upload CSV' });
    expect(calls.filter(c => c.path === '/api/imports/csv')).toHaveLength(0);
    await userEvent.click(screen.getByRole('button', { name: 'Validate only' }));
    expect(await screen.findByText('Validation result (nothing saved)')).toBeInTheDocument();
    expect(screen.getByText('Reminders proposed')).toBeInTheDocument();
    expect(imported).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Upload CSV' }));
    expect(await screen.findByText('Import #42 complete')).toBeInTheDocument();
    expect(await screen.findByText('history.csv')).toBeInTheDocument();
    expect(calls.every(c => c.method === 'GET' || c.path.startsWith('/api/imports/'))).toBe(true);
  });
  it('shows backend preview errors', async () => {
    sessionStorage.setItem('repayx.automationKey', KEY);
    installFakeApi({
      'GET /api/automation/me': { body: { success: true, name: 'omar', role: 'operator' } },
      'GET /api/automation/dashboard': { body: { success: true, ...dashboard } },
      'GET /api/imports': { body: { success: true, imports: [], pagination: {} } },
      'POST /api/imports/preview': { status: 422, body: { success: false, error: { code: 'invalid_csv', message: 'CSV has invalid encoding' } } },
    });
    renderAt(<AutomationPage />, { url: '/automation', path: '/automation' });
    await userEvent.click(await screen.findByRole('button', { name: /Import CSV/i }));
    await userEvent.upload(screen.getByLabelText('CSV file'), new File(['bad'], 'test.csv', { type: 'text/csv' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('CSV has invalid encoding');
    expect(screen.queryByRole('button', { name: 'Upload CSV' })).not.toBeInTheDocument();
  });
});

it('ignores a preview response after the selected file is removed', async () => {
  sessionStorage.setItem('repayx.automationKey', KEY);
  let resolvePreview!: (value: { body: unknown }) => void;
  installFakeApi({
    'GET /api/automation/me': { body: { success: true, name: 'omar', role: 'operator' } },
    'GET /api/automation/dashboard': { body: { success: true, ...dashboard } },
    'GET /api/imports': { body: { success: true, imports: [], pagination: {} } },
    'POST /api/imports/preview': () => new Promise(resolve => { resolvePreview = resolve; }),
  });
  renderAt(<AutomationPage />, { url: '/automation', path: '/automation' });
  await userEvent.click(await screen.findByRole('button', { name: /Import CSV/i }));
  await userEvent.upload(screen.getByLabelText('CSV file'), new File(['id\n1'], 'test.csv', { type: 'text/csv' }));
  await userEvent.click(screen.getByRole('button', { name: 'Remove file' }));
  resolvePreview({ body: { success: true, headers: [], available_fields: [], required_fields: [], missing_required: [], suggested_mapping: {}, sample_rows: [], row_count: 1 } });
  await waitFor(() => expect(screen.queryByText(/Uploading preview/)).not.toBeInTheDocument());
  expect(screen.queryByRole('button', { name: 'Upload CSV' })).not.toBeInTheDocument();
});

it('locks duplicate submissions and displays an import failure without a success message', async () => {
  sessionStorage.setItem('repayx.automationKey', KEY);
  let finish!: (value: { status: number; body: unknown }) => void;
  const calls = installFakeApi({
    'GET /api/automation/me': { body: { success: true, name: 'omar', role: 'operator' } },
    'GET /api/automation/dashboard': { body: { success: true, ...dashboard } },
    'GET /api/imports': { body: { success: true, imports: [], pagination: {} } },
    'POST /api/imports/preview': { body: { success: true, headers: ['id'], available_fields: ['customer_id'], required_fields: ['customer_id'], missing_required: [], suggested_mapping: { customer_id: 'id' }, sample_rows: [], row_count: 1 } },
    'POST /api/imports/csv': () => new Promise(resolve => { finish = resolve; }),
  });
  renderAt(<AutomationPage />, { url: '/automation', path: '/automation' });
  await userEvent.click(await screen.findByRole('button', { name: /Import CSV/i }));
  await userEvent.upload(screen.getByLabelText('CSV file'), new File(['id\n1'], 'test.csv', { type: 'text/csv' }));
  const upload = await screen.findByRole('button', { name: 'Upload CSV' });
  await userEvent.dblClick(upload);
  expect(upload).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Remove file' })).toBeDisabled();
  expect(screen.getByLabelText('Import type')).toBeDisabled();
  expect(calls.filter(c => c.path === '/api/imports/csv')).toHaveLength(1);
  finish({ status: 422, body: { success: false, error: { code: 'missing_columns', message: 'customer_id is required' } } });
  expect(await screen.findByRole('alert')).toHaveTextContent('customer_id is required');
  expect(upload).toBeEnabled();
  expect(screen.queryByText(/Import #.*complete/)).not.toBeInTheDocument();
});
