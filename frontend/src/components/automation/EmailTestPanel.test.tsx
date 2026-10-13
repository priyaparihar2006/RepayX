import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { installFakeApi } from '../../test/fakeApi';
import { EmailTestPanel } from './EmailTestPanel';

describe('Apps Script admin test panel', () => {
  it('defaults to simulation, requires consent, and displays provider acceptance accurately', async () => {
    const calls = installFakeApi({
      'GET /api/automation/email-test': { body: { enabled: true, ready: true, problem: null, allowlisted_count: 2, runs: [] } },
      'POST /api/automation/email-test': ({ body }) => ({ body: { run: { status: (body as {send_real:boolean}).send_real ? 'accepted' : 'simulated' } } }),
    });
    render(<EmailTestPanel />);
    await screen.findByText(/2 allowlisted recipients/);
    expect(screen.getByRole('button', {name:'Simulate email test'})).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Authorized test email'), 'one@example.invalid');
    await userEvent.click(screen.getByLabelText('This recipient explicitly authorized this test email.'));
    await userEvent.click(screen.getByRole('button', {name:'Simulate email test'}));
    expect(await screen.findByRole('status')).toHaveTextContent('No email was sent');
    expect(calls.filter(c => c.method === 'POST')[0].body).toMatchObject({send_real:false, authorized:true});
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await userEvent.click(screen.getByLabelText('Send one real email instead of a simulation'));
    await userEvent.click(screen.getByRole('button', {name:'Send one real test email'}));
    expect(calls.filter(c => c.method === 'POST')).toHaveLength(1);
    confirm.mockReturnValue(true);
    await userEvent.click(screen.getByRole('button', {name:'Send one real test email'}));
    expect(await screen.findByRole('status')).toHaveTextContent('Inbox delivery is not confirmed');
    confirm.mockRestore();
  });

  it('keeps real-send disabled when the server gate is closed', async () => {
    installFakeApi({'GET /api/automation/email-test': {body:{enabled:false,ready:false,problem:'Deployment missing',allowlisted_count:0,runs:[]}}});
    render(<EmailTestPanel />);
    await screen.findByText(/Deployment missing/);
    expect(screen.getByLabelText('Send one real email instead of a simulation')).toBeDisabled();
  });
});
