import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WhatsAppPage } from './WhatsApp';
import { installFakeApi } from '../test/fakeApi';

const admin = '+12025550101';
function api(ready = true, fails = false) {
  return installFakeApi({
    'GET /api/whatsapp/status': { body: { success: true, ready, enabled: ready, test_mode: true,
      missing: ready ? [] : ['WHATSAPP_ACCESS_TOKEN'], webhook_configured: false } },
    'GET /api/whatsapp/contacts': { body: { success: true, contacts: [
      { name: 'Admin contact', phone: admin, role: 'admin', opted_in: true, test_recipient: true },
      { name: 'Defaulter contact', phone: '+12025550102', role: 'defaulter', opted_in: false, test_recipient: false },
    ] } },
    'GET /api/whatsapp/templates': { body: { success: true, templates: [
      { name: 'hello_world', language: 'en_US', body: 'Hello test recipient', parameters: 0 },
    ] } },
    'GET /api/whatsapp/messages': { body: { success: true, messages: [], incoming: [] } },
    'POST /api/whatsapp/messages': fails
      ? { status: 502, body: { success: false, error: { message: 'Send result unknown. Check delivery history.' } } }
      : { body: { success: true, status: 'accepted', provider_id: 'wamid.test' } },
  });
}

async function openMessaging() {
  await userEvent.type(screen.getByLabelText('Operator key'), 'local-operator-key');
  await userEvent.click(screen.getByRole('button', { name: 'Open messaging' }));
  await screen.findByRole('heading', { name: 'Configured contacts' });
  await userEvent.selectOptions(screen.getByLabelText('Recipient'), admin);
}

afterEach(() => vi.useRealTimers());

describe('WhatsApp messaging', () => {
  it('shows today in India time and contact roles while keeping unconfigured sends disabled', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-06T04:30:00Z'));
    const calls = api(false);
    render(<WhatsAppPage />);
    expect(screen.getByText(/6 October 2026/)).toBeInTheDocument();
    await openMessaging();
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('defaulter')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Defaulter contact/ })).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: 'Send WhatsApp message' })).toBeDisabled();
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(0);
  });

  it('requires review, submits the exact preview once, and distinguishes acceptance from delivery', async () => {
    const calls = api();
    render(<WhatsAppPage />);
    await openMessaging();
    const button = screen.getByRole('button', { name: 'Send WhatsApp message' });
    expect(button).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.dblClick(button);
    expect(await screen.findByRole('status')).toHaveTextContent('Delivery is not yet confirmed');
    const posts = calls.filter((c) => c.method === 'POST');
    expect(posts).toHaveLength(1);
    expect(posts[0].body).toMatchObject({ recipient: admin, template: 'hello_world', language: 'en_US',
      preview: 'Hello test recipient', parameters: [], confirm_send: true, request_id: expect.any(String) });
    expect(button).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Lock messaging' }));
    expect(screen.queryByRole('heading', { name: 'Configured contacts' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Operator key')).toHaveValue('');
  });

  it('shows uncertain send errors without claiming delivery or retrying automatically', async () => {
    const calls = api(true, true);
    render(<WhatsAppPage />);
    await openMessaging();
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Send WhatsApp message' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Send result unknown');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send WhatsApp message' })).toBeDisabled();
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(1);
  });
});
