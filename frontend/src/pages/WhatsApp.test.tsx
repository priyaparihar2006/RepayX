import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WhatsAppPage } from './WhatsApp';
import { whatsapp } from '../services/whatsapp';

vi.mock('../services/whatsapp', () => ({ whatsapp: {
  getStatus: vi.fn(), getContacts: vi.fn(), getMessages: vi.fn(), sendMessage: vi.fn(),
  generateQR: vi.fn(), pairByCode: vi.fn(), disconnect: vi.fn(),
  getLoanEmiData: vi.fn().mockResolvedValue({ success: true, users: [], total: 0, page: 1, total_pages: 1, summary: {} }),
  uploadDefaultersFile: vi.fn(), dispatchExtracted: vi.fn(), triggerAiAutoOutreach: vi.fn(),
  previewScheduledCsv: vi.fn(), confirmSchedule: vi.fn(),
  getScheduledList: vi.fn().mockResolvedValue({ success: true, total: 0, page: 1, page_size: 50, total_pages: 1, stats: {}, schedules: [] }),
  updateScheduleTime: vi.fn(),
} }));
const connected = { success: true, enabled: true, ready: true, connected: true, status: 'CONNECTED' as const,
  session_info: { phone_number: '+918650629360', user_name: 'Demo', device: 'WhatsApp', connected_at: '' },
  stats: { total_sent: 0, total_failed: 0, total_pending: 0 }, server_time: '' };
const phones = ['+917060200849', '+919105830551', '+918077815522'];

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(whatsapp.getStatus).mockResolvedValue(connected);
  vi.mocked(whatsapp.getMessages).mockResolvedValue({ success: true, messages: [], count: 0 });
  vi.mocked(whatsapp.getContacts).mockResolvedValue({ success: true, contacts: ['Nancy', 'Sid', 'Ajay'].map((name, index) => ({
    name, phone: phones[index], customer_id: 385057 + index, amount: '100', late_days: 10,
    sample_data: true, message: 'Dear ' + name + ', demo EMI notice.',
  })) });
  vi.mocked(whatsapp.getLoanEmiData).mockResolvedValue({ success: true, users: [], total: 0, page: 1, total_pages: 1, page_size: 10, summary: { total_users: 0, total_loan_amount: 0, total_emi_paid: 0, total_emi_left_to_repay: 0, high_risk_users: 0, medium_risk_users: 0 } });
  vi.mocked(whatsapp.getScheduledList).mockResolvedValue({ success: true, total: 0, page: 1, page_size: 50, total_pages: 1, stats: { total_imported: 0, valid_records: 0, invalid_records: 0, scheduled_messages: 0, unscheduled_customers: 0, missed_schedules: 0, messages_sent: 0, messages_failed: 0 }, schedules: [] });
  vi.mocked(whatsapp.sendMessage).mockResolvedValue({ success: true, status: 'sent', message_id: 'provider-id', recipient: phones[0] });
});

describe('WhatsApp demo outreach', () => {
  it('handles an older contact response without message text', async () => {
    vi.mocked(whatsapp.getContacts).mockResolvedValue({ success: true, contacts: [{
      name: 'Nancy', phone: phones[0], customer_id: 385057, amount: '100', late_days: 10,
      sample_data: true,
    } as Awaited<ReturnType<typeof whatsapp.getContacts>>['contacts'][number]] });
    render(<WhatsAppPage />);
    expect(await screen.findByRole('textbox', { name: 'Message for Nancy' })).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Send to Nancy' })).toBeDisabled();
  });
  it('edits each notice and sends all three exactly once', async () => {
    const user = userEvent.setup();
    render(<WhatsAppPage />);
    const editor = await screen.findByRole('textbox', { name: 'Message for Nancy' });
    await user.clear(editor);
    await user.type(editor, 'Edited Nancy EMI notice');
    await user.click(screen.getByRole('button', { name: 'Send all pending messages (3)' }));
    await waitFor(() => expect(whatsapp.sendMessage).toHaveBeenCalledTimes(3));
    expect(vi.mocked(whatsapp.sendMessage).mock.calls.map(([payload]) => payload.recipient)).toEqual(phones);
    expect(whatsapp.sendMessage).toHaveBeenNthCalledWith(1, expect.objectContaining({ message: 'Edited Nancy EMI notice', customer_name: 'Nancy', request_id: expect.any(String) }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send all pending messages (0)' })).toBeDisabled());
  });

  it('requires the expected sender and never sends just by linking', async () => {
    vi.mocked(whatsapp.getStatus).mockResolvedValue({ ...connected, session_info: { ...connected.session_info, phone_number: '+919999999999' } });
    render(<WhatsAppPage />);
    await screen.findByRole('textbox', { name: 'Message for Sid' });
    expect(screen.getByRole('button', { name: 'Send all pending messages (3)' })).toBeDisabled();
    expect(whatsapp.sendMessage).not.toHaveBeenCalled();
    expect(screen.getByText(/This is a different account/)).toBeInTheDocument();
  });

  it('keeps a failed send visible without reporting success or automatic retries', async () => {
    vi.mocked(whatsapp.sendMessage).mockRejectedValue(new Error('Bridge timed out'));
    const user = userEvent.setup();
    render(<WhatsAppPage />);
    await user.click(await screen.findByRole('button', { name: 'Send to Ajay' }));
    await screen.findByText(/Bridge timed out/);
    expect(screen.getByText('Send status: unknown')).toBeInTheDocument();
    expect(whatsapp.sendMessage).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Send to Ajay' })).toBeDisabled();
  });

  it('disables a blank message instead of restoring a default', async () => {
    const user = userEvent.setup();
    render(<WhatsAppPage />);
    await user.clear(await screen.findByRole('textbox', { name: 'Message for Nancy' }));
    expect(screen.getByRole('button', { name: 'Send to Nancy' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Send all pending messages (3)' })).toBeDisabled();
  });

  it('renders scheduled records and confirms schedule on explicit user action', async () => {
    const user = userEvent.setup();
    const scheduledMock = [
      {
        schedule_id: 'sched_1', customer_id: 'RX-TEST-1001', customer_name: 'Nans',
        phone_number: '+919058802116', unpaid_amount: 12500, risk_category: 'HIGH',
        payment_status: 'UNPAID', scheduled_message_time: '10:45', timezone: 'Asia/Kolkata',
        scheduled_message_at: '2026-10-10T10:45:00+05:30', schedule_status: 'SCHEDULED' as const,
        is_valid: true, message_text: 'Notice',
      },
      {
        schedule_id: 'sched_3', customer_id: 'RX-TEST-1003', customer_name: 'Siddharth',
        phone_number: '+919105830551', unpaid_amount: 6200, risk_category: 'MEDIUM',
        payment_status: 'UNPAID', scheduled_message_time: null, timezone: 'Asia/Kolkata',
        scheduled_message_at: null, schedule_status: 'UNSCHEDULED' as const,
        is_valid: true, message_text: 'Notice',
      },
    ];
    vi.mocked(whatsapp.getScheduledList).mockResolvedValue({
      success: true, total: 2, page: 1, page_size: 50, total_pages: 1,
      stats: { total_imported: 2, valid_records: 2, invalid_records: 0, scheduled_messages: 1, unscheduled_customers: 1, missed_schedules: 0, messages_sent: 0, messages_failed: 0 },
      schedules: scheduledMock,
    });
    vi.mocked(whatsapp.confirmSchedule).mockResolvedValue({
      success: true, saved_count: 2, skipped_sent_count: 0,
      stats: { total_imported: 2, valid_records: 2, invalid_records: 0, scheduled_messages: 1, unscheduled_customers: 1, missed_schedules: 0, messages_sent: 0, messages_failed: 0 },
    });

    render(<WhatsAppPage />);
    expect(await screen.findByText('Nans')).toBeInTheDocument();
    expect(screen.getByText('Siddharth')).toBeInTheDocument();
    expect(screen.getByText('🟢 Scheduled')).toBeInTheDocument();
    expect(screen.getByText('⚪ Unscheduled')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /Schedule/i });
    await user.click(confirmBtn);
    expect(whatsapp.confirmSchedule).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ customer_name: 'Nans' })]), 'default');
  });
});
