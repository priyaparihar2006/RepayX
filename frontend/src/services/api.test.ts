import { describe, expect, it, vi } from 'vitest';
import { ApiError, api } from './api';
import { installFakeApi, installUnreachableApi } from '../test/fakeApi';
import { customer385772, customerList, summary } from '../test/fixtures';

async function errorOf(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (err) {
    expect(err).toBeInstanceOf(ApiError);
    return err as ApiError;
  }
  throw new Error('expected the request to fail');
}

describe('api client', () => {
  it('uses VITE_API_BASE_URL and sends list filters as query parameters', async () => {
    const calls = installFakeApi({ 'GET /api/customers': { body: customerList([summary(1, 70)]) } });
    await api.customers({ page: 2, page_size: 10, risk_category: 'High Risk', search: '385', sort_by: 'late_payment_rate', sort_order: 'asc' });
    expect(vi.mocked(fetch).mock.calls[0][0]).toMatch(/^http:\/\/api\.test\/api\/customers\?/);
    expect(Object.fromEntries(calls[0].params)).toEqual({
      page: '2', page_size: '10', risk_category: 'High Risk', search: '385', sort_by: 'late_payment_rate', sort_order: 'asc',
    });
  });

  it('omits empty parameters', async () => {
    const calls = installFakeApi({ 'GET /api/customers': { body: customerList([]) } });
    await api.customers({ search: '', risk_category: undefined });
    expect([...calls[0].params.keys()]).toEqual([]);
  });

  it('posts questions as JSON', async () => {
    const calls = installFakeApi({
      'POST /api/query': { body: { success: true, query: 'q', query_type: 'aggregate_query', result: 'r', model_version: null } },
    });
    await api.query('How many customers are there?');
    expect(calls[0]).toMatchObject({ method: 'POST', body: { query: 'How many customers are there?' } });
  });

  it('returns validated data', async () => {
    installFakeApi({ 'GET /api/customer/385772': { body: customer385772 } });
    const body = await api.customer(385772);
    expect(body.customer.risk_category).toBe('High Risk');
  });

  it.each([
    [404, 'not_found', 'customer_not_found', 'Customer 1 was not found.'],
    [422, 'validation', 'validation_error', 'The request is invalid.'],
    [503, 'unavailable', 'customer_data_unavailable', 'Customer data is not available.'],
  ])('maps HTTP %i to %s and keeps the backend message', async (status, kind, code, message) => {
    installFakeApi({ 'GET /api/customer/1': { status, body: { success: false, error: { code, message } } } });
    const err = await errorOf(api.customer(1));
    expect([err.kind, err.code, err.message, err.status]).toEqual([kind, code, message, status]);
  });

  it('never shows raw server error text for 500s', async () => {
    installFakeApi({ 'GET /api/analytics': { status: 500, body: { detail: 'Traceback (most recent call last): ...' } } });
    const err = await errorOf(api.analytics());
    expect(err.kind).toBe('server');
    expect(err.message).not.toMatch(/Traceback/);
  });

  it('reports an unreachable backend', async () => {
    installUnreachableApi();
    const err = await errorOf(api.health());
    expect(err.kind).toBe('network');
    expect(err.message).toMatch(/Cannot reach the RepayX API/);
  });

  it('rejects responses in an unexpected shape', async () => {
    installFakeApi({ 'GET /api/customer/1': { body: { success: true, something: 'else' } } });
    expect((await errorOf(api.customer(1))).kind).toBe('invalid_response');
  });

  it('rejects non-JSON responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>proxy error</html>', { status: 502 })));
    expect((await errorOf(api.health())).kind).toBe('invalid_response');
  });

  it('reports missing configuration without calling fetch', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    expect((await errorOf(api.health())).kind).toBe('config');
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });
});
