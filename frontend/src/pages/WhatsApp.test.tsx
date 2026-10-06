import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WhatsAppPage } from './WhatsApp';
import { installFakeApi } from '../test/fakeApi';

const mockStatusDisconnected = {
  success: true,
  enabled: true,
  ready: true,
  connected: false,
  status: 'DISCONNECTED',
  qr_code: null,
  qr_expires_in: 0,
  session_info: null,
  stats: { total_sent: 12, total_failed: 0, total_pending: 0 },
  server_time: '2026-10-06T12:00:00Z',
};

const mockStatusConnected = {
  ...mockStatusDisconnected,
  connected: true,
  status: 'CONNECTED',
  session_info: {
    connected: true,
    phone_number: '+919820154321',
    user_name: 'RepayX Collections Team',
    device: 'WhatsApp Web (Chrome / Windows)',
    connected_at: '2026-10-06T12:00:00Z',
    session_id: 'sess123',
  },
};

const mockTemplates = [
  {
    id: 'urgent_settlement',
    name: 'Urgent High-Risk Settlement Notice',
    category: 'Urgent',
    description: 'High-priority alert for critical risk defaulters',
    body: 'URGENT: Dear {{customer_name}}, your loan account #{{customer_id}} has ₹{{unpaid_amount}} overdue. Pay here: {{payment_link}}',
    parameters: ['customer_name', 'customer_id', 'unpaid_amount', 'payment_link'],
  },
  {
    id: 'overdue_notice',
    name: 'Standard Overdue Payment Notice',
    category: 'Overdue',
    description: 'Standard reminder specifying overdue balance',
    body: 'Dear {{customer_name}}, your EMI of ₹{{unpaid_amount}} for Loan #{{customer_id}} is overdue.',
    parameters: ['customer_name', 'customer_id', 'unpaid_amount'],
  },
];

const mockDefaulters = {
  success: true,
  defaulters: [
    {
      customer_id: 385772,
      name: 'Rahul Sharma',
      phone: '+919820154321',
      risk_score: 80.1,
      risk_category: 'High Risk',
      predicted_default: 1,
      total_unpaid_amount: 28450.0,
      avg_days_late: 18.5,
      late_payment_rate: 85.0,
      last_sent_status: 'none',
      recommended_template: 'urgent_settlement',
    },
    {
      customer_id: 385001,
      name: 'Ananya Verma',
      phone: '+919811287654',
      risk_score: 72.4,
      risk_category: 'High Risk',
      predicted_default: 1,
      total_unpaid_amount: 19200.0,
      avg_days_late: 14.0,
      late_payment_rate: 60.0,
      last_sent_status: 'delivered',
      recommended_template: 'urgent_settlement',
    },
  ],
  total: 2,
  page: 1,
  page_size: 15,
  total_pages: 1,
  summary: {
    total_defaulters: 2,
    high_risk_defaulters: 2,
    medium_risk_defaulters: 0,
    total_unpaid_exposure: 47650.0,
    total_unpaid_formatted: '47,650',
  },
};

function setupFakeApi(connected = false) {
  return installFakeApi({
    'GET /api/whatsapp/status': { body: connected ? mockStatusConnected : mockStatusDisconnected },
    'GET /api/whatsapp/templates': { body: { success: true, templates: mockTemplates } },
    'GET /api/whatsapp/defaulters': { body: mockDefaulters },
    'GET /api/whatsapp/messages': { body: { success: true, messages: [], incoming: [] } },
    'POST /api/whatsapp/qr/generate': {
      body: {
        success: true,
        qr_code: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
        qr_string: '2@test,key,token',
        expires_in: 120,
        status: 'SCAN_QR_CODE',
      },
    },
    'POST /api/whatsapp/qr/pair': {
      body: {
        success: true,
        session: mockStatusConnected.session_info,
        message: 'WhatsApp device paired successfully.',
      },
    },
    'POST /api/whatsapp/disconnect': {
      body: { success: true, connected: false, message: 'Disconnected' },
    },
    'POST /api/whatsapp/auto-dispatch': {
      body: {
        success: true,
        total_targeted: 2,
        total_sent: 2,
        dispatched: [
          { request_id: 'req1', status: 'delivered', recipient: '+919820154321', timestamp: '2026-10-06T12:00:00Z' },
          { request_id: 'req2', status: 'delivered', recipient: '+919811287654', timestamp: '2026-10-06T12:00:00Z' },
        ],
        timestamp: '2026-10-06T12:00:00Z',
      },
    },
    'POST /api/whatsapp/send': {
      body: { success: true, status: 'delivered', request_id: 'req-single', provider_id: 'wamid.123' },
    },
  });
}

afterEach(() => vi.useRealTimers());

describe('WhatsApp Web QR and Defaulters Outreach Page', () => {
  it('renders WhatsApp Web QR section, defaulters summary, and defaulter list', async () => {
    setupFakeApi(false);
    render(<WhatsAppPage />);

    expect(screen.getByText('WhatsApp Web Defaulter Recovery')).toBeInTheDocument();
    expect(screen.getByText(/Scan QR Code to Connect WhatsApp/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Rahul Sharma')).toBeInTheDocument();
      expect(screen.getByText('Ananya Verma')).toBeInTheDocument();
      expect(screen.getByText('₹47,650')).toBeInTheDocument();
    });
  }, 15000);

  it('allows pairing via mobile scan simulation and triggers automated dispatch', async () => {
    const calls = setupFakeApi(true);
    render(<WhatsAppPage />);

    await waitFor(() => {
      expect(screen.getByText('Rahul Sharma')).toBeInTheDocument();
    });

    const dispatchButton = screen.getByRole('button', { name: /Start Automated Outreach/i });
    expect(dispatchButton).toBeInTheDocument();

    await userEvent.click(dispatchButton);

    await waitFor(() => {
      expect(screen.getByText(/Automated outreach completed/i)).toBeInTheDocument();
    });

    const postCalls = calls.filter((c) => c.method === 'POST' && c.path === '/api/whatsapp/auto-dispatch');
    expect(postCalls).toHaveLength(1);
    expect(postCalls[0].body).toMatchObject({
      target_tier: 'high',
      template_id: 'urgent_settlement',
    });
  }, 15000);

  it('allows opening quick send modal for a single defaulter and sending a direct message', async () => {
    const calls = setupFakeApi(true);
    render(<WhatsAppPage />);

    await waitFor(() => {
      expect(screen.getByText('Rahul Sharma')).toBeInTheDocument();
    });

    const quickSendButtons = screen.getAllByRole('button', { name: /Send Outreach/i });
    await userEvent.click(quickSendButtons[0]);

    expect(screen.getByText(/Direct outreach to Rahul Sharma/i)).toBeInTheDocument();

    const sendButton = screen.getByRole('button', { name: /Send Direct Message/i });
    await userEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/Message delivered to Rahul Sharma/i)).toBeInTheDocument();
    });

    const postSingleCalls = calls.filter((c) => c.method === 'POST' && c.path === '/api/whatsapp/send');
    expect(postSingleCalls).toHaveLength(1);
    expect(postSingleCalls[0].body).toMatchObject({
      customer_id: 385772,
      recipient: '+919820154321',
    });
  }, 15000);
});

