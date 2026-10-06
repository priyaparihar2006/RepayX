import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AiAssistantDrawer } from './AiAssistantDrawer';
import { installFakeApi, installUnreachableApi } from '../../test/fakeApi';

const input = () => screen.getByLabelText('Ask RepayX Copilot');
const reply = (query: string, result: string) => ({
  success: true, query, result, query_type: 'unsupported_query', model_version: null,
});
const mount = () => render(<AiAssistantDrawer isOpen onClose={vi.fn()} onNavigateToTab={vi.fn()} />);

describe('Copilot API integration', () => {
  it('sends each question unchanged and displays distinct answers for status and birthday', async () => {
    const status = 'What is the status of Rahul Sharma?';
    const birthday = 'when is birthday of rahul sharma?';
    const calls = installFakeApi({ 'POST /api/query': (call) => {
      const { query } = call.body as { query: string };
      return { body: reply(query, query === status ? 'Provide a numeric customer ID; names are not stored.' : 'Birthdays are not available.') };
    } });
    mount();
    await userEvent.type(input(), `${status}{Enter}`);
    expect(await screen.findByText('Provide a numeric customer ID; names are not stored.')).toBeInTheDocument();
    await userEvent.type(input(), `${birthday}{Enter}`);
    expect(await screen.findByText('Birthdays are not available.')).toBeInTheDocument();
    expect(calls.map((c) => c.body)).toEqual([{ query: status }, { query: birthday }]);
    expect(screen.queryByText(/salary delay and promised payment/)).not.toBeInTheDocument();
  });

  it('shows a backend error instead of falling back to a canned response, and allows retry', async () => {
    installUnreachableApi();
    mount();
    await userEvent.type(input(), 'average risk score{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the RepayX API');
    const calls = installFakeApi({ 'POST /api/query': { body: reply('average risk score', 'The average risk score is 41.80.') } });
    await userEvent.type(input(), 'average risk score{Enter}');
    expect(await screen.findByText('The average risk score is 41.80.')).toBeInTheDocument();
    expect(calls).toHaveLength(1);
  });

  it('prevents duplicate requests while an answer is pending and ignores blank questions', async () => {
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => { finish = resolve; });
    const calls = installFakeApi({ 'POST /api/query': async () => {
      await pending;
      return { body: reply('question', 'Finished.') };
    } });
    mount();
    await userEvent.type(input(), '   {Enter}');
    expect(calls).toHaveLength(0);
    await userEvent.type(input(), 'question{Enter}{Enter}');
    expect(calls).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Send question' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'How many high-risk customers are there?' })).toBeDisabled();
    finish();
    await waitFor(() => expect(screen.getByText('Finished.')).toBeInTheDocument());
  });

  it('navigates API customer results to scored profiles, not demo profiles', async () => {
    installFakeApi({ 'POST /api/query': { body: {
      ...reply('customer 385772', 'Customer risk answer'), query_type: 'customer_query',
      customer: { customer_id: 385772, risk_category: 'High Risk', risk_score: 78.23 },
    } } });
    const navigate = vi.fn();
    const close = vi.fn();
    render(<AiAssistantDrawer isOpen onClose={close} onNavigateToTab={navigate} />);
    await userEvent.type(input(), 'customer 385772{Enter}');
    await userEvent.click(await screen.findByRole('button', { name: /Customer 385772/ }));
    expect(navigate).toHaveBeenCalledWith('risk-customer', '385772');
    expect(close).toHaveBeenCalled();
  });
});
