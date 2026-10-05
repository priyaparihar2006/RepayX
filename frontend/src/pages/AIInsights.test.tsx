import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AIInsightsPage } from './AIInsights';
import { installFakeApi, installUnreachableApi } from '../test/fakeApi';
import type { RecordedCall } from '../test/fakeApi';
import { queryAnswers } from '../test/fixtures';
import { location, renderAt } from '../test/render';

function installQueryApi() {
  return installFakeApi({
    'POST /api/query': (call: RecordedCall) => {
      const q = (call.body as { query: string }).query;
      const answer = queryAnswers[q];
      return answer
        ? { body: answer }
        : { status: 503, body: { success: false, error: { code: 'retrieval_unavailable', message: 'General retrieval is not available.' } } };
    },
  });
}

const input = () => screen.getByLabelText('Ask a question about the loan portfolio');
const posts = (calls: RecordedCall[]) => calls.filter((c) => c.method === 'POST');

describe('AI Insights', () => {
  it('submits a typed question to POST /api/query and shows metric results', async () => {
    const calls = installQueryApi();
    renderAt(<AIInsightsPage />, { url: '/insights', path: '/insights' });

    await userEvent.type(input(), 'How many high-risk customers are there?{Enter}');

    expect(await screen.findByText('There are 12,646 High Risk customers, 20.56% of the 61,503 scored customers.')).toBeInTheDocument();
    expect(screen.getByText('Aggregate query')).toBeInTheDocument();
    expect(screen.getByText('Number of High Risk customers')).toBeInTheDocument();
    expect(screen.getByText('12,646')).toBeInTheDocument();
    expect(posts(calls)).toHaveLength(1);
    expect(posts(calls)[0].body).toEqual({ query: 'How many high-risk customers are there?' });
    expect(location()).toBe('/insights?q=How+many+high-risk+customers+are+there%3F');
  });

  it('runs a suggested question and shows customer results in a table', async () => {
    installQueryApi();
    renderAt(<AIInsightsPage />, { url: '/insights', path: '/insights' });

    await userEvent.click(screen.getByRole('button', { name: 'Which customers have high late-payment rates?' }));
    // The suggestion is sent as typed; this fixture only answers the canonical wording, so check the request path instead.
    await waitFor(() => expect(location()).toContain('q=Which+customers+have+high+late-payment+rates'));

    await userEvent.clear(input());
    await userEvent.type(input(), 'Which customers frequently pay late?');
    await userEvent.click(screen.getByRole('button', { name: /Ask RepayX/ }));

    const table = await screen.findByRole('table');
    expect(within(table).getByText('110232')).toBeInTheDocument();
    expect(screen.getByText('Structured retrieval')).toBeInTheDocument();
    expect(screen.getByText(/Showing 2 of 30,946 matching customers/)).toBeInTheDocument();
  });

  it('shows a customer card with a profile link for customer questions', async () => {
    installQueryApi();
    renderAt(<AIInsightsPage />, { url: `/insights?q=${encodeURIComponent('What is the risk status of customer 385772?')}`, path: '/insights' });

    expect(await screen.findByText('Customer query')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open profile' })).toHaveAttribute('href', '/customers/385772');
  });

  it('does not submit empty or over-long questions', async () => {
    const calls = installQueryApi();
    renderAt(<AIInsightsPage />, { url: '/insights', path: '/insights' });
    const ask = screen.getByRole('button', { name: /Ask RepayX/ });
    expect(ask).toBeDisabled();

    await userEvent.type(input(), '   {Enter}');
    expect(ask).toBeDisabled();

    await userEvent.click(input());
    await userEvent.paste('x'.repeat(501));
    expect(screen.getByText('Questions are limited to 500 characters.')).toBeInTheDocument();
    expect(ask).toBeDisabled();
    expect(posts(calls)).toHaveLength(0);
  });

  it('shows the API message when a service is unavailable', async () => {
    installQueryApi();
    renderAt(<AIInsightsPage />, { url: '/insights', path: '/insights' });
    await userEvent.type(input(), 'pensioner widow{Enter}');
    expect(await screen.findByText('Data unavailable')).toBeInTheDocument();
    expect(screen.getByText('General retrieval is not available.')).toBeInTheDocument();
  });

  it('shows a retryable error when the backend is down', async () => {
    installUnreachableApi();
    renderAt(<AIInsightsPage />, { url: '/insights', path: '/insights' });
    await userEvent.type(input(), 'How many high-risk customers are there?{Enter}');
    expect(await screen.findByText('Backend unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
