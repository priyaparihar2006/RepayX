import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomersPage } from './Customers';
import { installFakeApi } from '../test/fakeApi';
import { customerList, summary } from '../test/fixtures';
import { location, renderAt } from '../test/render';
import type { RecordedCall } from '../test/fakeApi';

const ALL = [summary(395476, 98.13), summary(385772, 80.13), summary(385001, 45), summary(100002, 20)];

/** Fake /api/customers that applies the risk filter and ID-prefix search like the backend. */
function installCustomersApi() {
  return installFakeApi({
    'GET /api/customers': (call: RecordedCall) => {
      const risk = call.params.get('risk_category');
      const search = call.params.get('search');
      const rows = ALL.filter((c) => (!risk || c.risk_category === risk) && (!search || String(c.customer_id).startsWith(search)));
      return { body: customerList(rows, rows.length === ALL.length ? 60 : rows.length, Number(call.params.get('page') ?? 1)) };
    },
  });
}

const rowIds = () => within(screen.getByRole('table')).getAllByRole('row').slice(1).map((r) => r.firstElementChild?.textContent);
const lastCall = (calls: RecordedCall[]) => calls[calls.length - 1];

describe('Customers page', () => {
  it('lists customers sorted by risk with the spec columns', async () => {
    const calls = installCustomersApi();
    renderAt(<CustomersPage />, { url: '/customers', path: '/customers' });

    await waitFor(() => expect(rowIds()).toEqual(['395476', '385772', '385001', '100002']));
    for (const header of ['Customer ID', 'Risk Score', 'Est. Default Probability', 'Risk Category', 'Late Payment Rate', 'Total Unpaid', 'Payment Ratio']) {
      expect(screen.getByRole('columnheader', { name: new RegExp(header) })).toBeInTheDocument();
    }
    expect(Object.fromEntries(calls[0].params)).toMatchObject({ page: '1', page_size: '25', sort_by: 'risk_score', sort_order: 'desc' });
  });

  it('filters by risk category and keeps the filter in the URL', async () => {
    const calls = installCustomersApi();
    renderAt(<CustomersPage />, { url: '/customers', path: '/customers' });
    await screen.findByText('395476');

    await userEvent.click(screen.getByRole('button', { name: 'Medium Risk' }));
    await waitFor(() => expect(rowIds()).toEqual(['385001']));
    expect(lastCall(calls).params.get('risk_category')).toBe('Medium Risk');
    expect(location()).toBe('/customers?risk=Medium+Risk');
    expect(screen.getByRole('button', { name: 'Medium Risk' })).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('button', { name: 'All' }));
    await waitFor(() => expect(rowIds()).toHaveLength(4));
  });

  it('searches by customer ID', async () => {
    const calls = installCustomersApi();
    renderAt(<CustomersPage />, { url: '/customers', path: '/customers' });
    await screen.findByText('395476');

    await userEvent.type(screen.getByLabelText('Search by customer ID'), '3857');
    await waitFor(() => expect(rowIds()).toEqual(['385772']));
    expect(lastCall(calls).params.get('search')).toBe('3857');
  });

  it('rejects non-numeric search without calling the API', async () => {
    const calls = installCustomersApi();
    renderAt(<CustomersPage />, { url: '/customers', path: '/customers' });
    await screen.findByText('395476');
    const before = calls.length;

    await userEvent.type(screen.getByLabelText('Search by customer ID'), 'abc');
    expect(await screen.findByText('Customer IDs contain digits only.')).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 400)); // past the search debounce
    expect(calls.length).toBe(before);
  });

  it('shows an empty state when nothing matches', async () => {
    installCustomersApi();
    renderAt(<CustomersPage />, { url: '/customers?q=999', path: '/customers' });
    expect(await screen.findByText('No customers found')).toBeInTheDocument();
  });

  it('sorts by a column and paginates', async () => {
    const calls = installCustomersApi();
    renderAt(<CustomersPage />, { url: '/customers', path: '/customers' });
    await screen.findByText('395476');

    await userEvent.click(screen.getByRole('button', { name: /Late Payment Rate/ }));
    await waitFor(() => expect(lastCall(calls).params.get('sort_by')).toBe('late_payment_rate'));
    expect(lastCall(calls).params.get('sort_order')).toBe('desc');

    expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument(); // 60 customers / 25 per page
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(lastCall(calls).params.get('page')).toBe('2'));
  });

  it('opens customer details when a row is clicked', async () => {
    installCustomersApi();
    renderAt(<CustomersPage />, { url: '/customers', path: '/customers' });
    await userEvent.click(await screen.findByText('385772'));
    expect(location()).toBe('/customers/385772');
  });
});
