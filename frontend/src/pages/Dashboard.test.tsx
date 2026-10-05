import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { DashboardPage } from './Dashboard';
import { installFakeApi, installUnreachableApi } from '../test/fakeApi';
import { analytics, customerList, summary } from '../test/fixtures';
import { renderAt } from '../test/render';

const topCustomers = customerList([summary(395476, 98.13), summary(428030, 97.97)], 61503, 1, 10);

describe('Dashboard', () => {
  it('renders summary cards, charts, and the top-risk table from the API', async () => {
    const calls = installFakeApi({
      'GET /api/analytics': { body: analytics },
      'GET /api/customers': { body: topCustomers },
    });
    renderAt(<DashboardPage />, { url: '/', path: '/' });

    expect(await screen.findByText('61,503')).toBeInTheDocument();
    for (const value of ['12,646', '28,392', '20,465', '8.52%', '30,946', '11,802,525.30', '9,523']) {
      expect(screen.getAllByText(value).length).toBeGreaterThan(0);
    }
    expect(screen.getByText('Risk Score Overview')).toBeInTheDocument();
    expect(screen.getByText('Late Payment Rate Distribution')).toBeInTheDocument();
    expect(document.querySelectorAll('.recharts-bar-rectangle').length).toBeGreaterThan(0);

    const table = await screen.findByRole('table');
    expect(within(table).getByText('395476')).toBeInTheDocument();
    expect(calls.find((c) => c.path === '/api/customers')?.params.get('sort_by')).toBe('risk_score');
    expect(screen.getByText(/should not be treated as a final lending decision/)).toBeInTheDocument();
  });

  it('offers a table view for charts', async () => {
    installFakeApi({ 'GET /api/analytics': { body: analytics }, 'GET /api/customers': { body: topCustomers } });
    renderAt(<DashboardPage />, { url: '/', path: '/' });
    await screen.findByText('Risk Score Overview');

    const [tableButton] = screen.getAllByRole('button', { name: 'Table' });
    tableButton.click();
    expect(await screen.findByText('11,339')).toBeInTheDocument(); // 20-30 histogram bin
  });

  it('shows a clear error when the backend is down', async () => {
    installUnreachableApi();
    renderAt(<DashboardPage />, { url: '/', path: '/' });
    expect(await screen.findByText('Backend unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
