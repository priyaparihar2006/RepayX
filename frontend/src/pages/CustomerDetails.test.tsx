import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { CustomerDetailsPage, parseCustomerId } from './CustomerDetails';
import { installFakeApi } from '../test/fakeApi';
import { customer385772, customerWithoutHistory } from '../test/fixtures';
import { renderAt } from '../test/render';

const PATH = '/customers/:customerId';

describe('Customer details', () => {
  it('shows risk, financial, profile, repayment, insight, and comparison data', async () => {
    installFakeApi({ 'GET /api/customer/385772': { body: customer385772 } });
    renderAt(<CustomerDetailsPage />, { url: '/customers/385772', path: PATH });

    expect(await screen.findByText('80.13/100')).toBeInTheDocument();
    expect(screen.getByText('High Risk')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    for (const text of ['135,000.00', 'Lower secondary', 'Laborers', '33.33%', '4.33']) {
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    }
    expect(screen.getByText(customer385772.insight.summary)).toBeInTheDocument();
    expect(screen.getByText('Concern')).toBeInTheDocument(); // severity has a word label, not just colour
    expect(screen.getByText('Predicted default')).toBeInTheDocument();
    expect(screen.getByText('vs avg 8.52%')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Risk score 80\.13 of 100, High Risk; classification threshold 65/ })).toBeInTheDocument();
  });

  it('shows dashes and an explanation when there is no installment history', async () => {
    installFakeApi({ 'GET /api/customer/456187': { body: customerWithoutHistory } });
    renderAt(<CustomerDetailsPage />, { url: '/customers/456187', path: PATH });

    expect(await screen.findByText('No installment history is available for this customer.')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(5);
    expect(screen.queryByText('0.00%')).not.toBeInTheDocument(); // unknown is not shown as zero
  });

  it('reports a customer that does not exist', async () => {
    installFakeApi({
      'GET /api/customer/999999': { status: 404, body: { success: false, error: { code: 'customer_not_found', message: 'Customer 999999 was not found.' } } },
    });
    renderAt(<CustomerDetailsPage />, { url: '/customers/999999', path: PATH });
    expect(await screen.findByText('Customer 999999 not found')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('rejects an invalid ID without calling the API', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    renderAt(<CustomerDetailsPage />, { url: '/customers/abc', path: PATH });
    expect(await screen.findByText('Invalid customer ID')).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([
    ['385772', 385772], ['0', null], ['-1', null], ['12.5', null], ['abc', null], ['99999999999', null], [undefined, null],
  ])('parseCustomerId(%s) -> %s', (raw, expected) => {
    expect(parseCustomerId(raw)).toBe(expected);
  });
});
