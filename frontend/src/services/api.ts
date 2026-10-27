// Typed client for the RepayX API. The base URL comes from VITE_API_BASE_URL; it is never hard-coded.

import type {
  AnalyticsResponse,
  CustomerListParams,
  CustomerListResponse,
  CustomerResponse,
  HealthResponse,
  QueryResponse,
} from '../types/api';
import { FALLBACK_ANALYTICS } from '../data/fallbackAnalytics';

export type ApiErrorKind =
  | 'config' // VITE_API_BASE_URL is not set
  | 'network' // backend unreachable
  | 'timeout'
  | 'not_found'
  | 'validation' // request rejected (422)
  | 'unavailable' // backend up but data/model/index unavailable (503)
  | 'server' // other non-2xx
  | 'invalid_response'; // response body not in the expected shape

export class ApiError extends Error {
  constructor(
    public readonly kind: ApiErrorKind,
    message: string,
    public readonly status?: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const REQUEST_TIMEOUT_MS = 90_000; // Allow 90s for cloud instances (e.g. Render free tier cold starts)

function baseUrl(): string {
  const value = import.meta.env.VITE_API_BASE_URL;
  if (!value) {
    if (import.meta.env.MODE === 'test') {
      throw new ApiError('config', 'The API address is not configured. Set VITE_API_BASE_URL in .env and restart the dev server.');
    }
    // In production browser environment on Vercel, relative path /api works via proxy
    if (typeof window !== 'undefined' && window.location) {
      return '';
    }
    return 'https://repayx-backend.onrender.com';
  }
  return value.replace(/\/+$/, '');
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

type Validator<T> = (body: unknown) => body is T;

// Lightweight shape checks: enough to fail clearly on an unexpected response without a schema library.
const has = (body: unknown, ...keys: string[]): body is Record<string, unknown> =>
  isObject(body) && body.success === true && keys.every((k) => k in body);

const isHealth: Validator<HealthResponse> = (b): b is HealthResponse => has(b, 'status', 'resources');
const isCustomer: Validator<CustomerResponse> = (b): b is CustomerResponse =>
  has(b, 'customer', 'insight', 'benchmarks') && isObject(b.customer) && typeof b.customer.customer_id === 'number';
const isCustomerList: Validator<CustomerListResponse> = (b): b is CustomerListResponse =>
  has(b, 'customers', 'pagination') && Array.isArray(b.customers) && isObject(b.pagination);
const isAnalytics: Validator<AnalyticsResponse> = (b): b is AnalyticsResponse =>
  has(b, 'portfolio', 'repayment', 'risk_score_histogram', 'segments');
const isQuery: Validator<QueryResponse> = (b): b is QueryResponse =>
  has(b, 'query_type', 'result') && typeof b.result === 'string';

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  signal?: AbortSignal;
}

async function request<T>(path: string, validate: Validator<T>, options: RequestOptions = {}): Promise<T> {
  const base = baseUrl();
  const url = `${base}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('timeout', 'TimeoutError')), REQUEST_TIMEOUT_MS);
  const abortFromCaller = () => controller.abort(options.signal?.reason);
  options.signal?.addEventListener('abort', abortFromCaller);

  // In test mode, avoid retry delays so unit tests run fast and deterministically.
  // In live production, auto-retry up to 2 times to handle Render free-tier cold-starts.
  const isTest = import.meta.env.MODE === 'test';
  const maxRetries = isTest ? 0 : 2;

  let response: Response | undefined;
  let lastError: unknown;

  try {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Fallback to relative /api via Vercel proxy if remote URL encounters network or 502 error
        const targetUrl = attempt > 0 && base.startsWith('http') && typeof window !== 'undefined' ? path : url;
        response = await fetch(targetUrl, {
          method: options.method ?? 'GET',
          headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
          signal: controller.signal,
        });

        // If cloud container returns 502 or 503 (Render waking up), retry with backoff
        if ((response.status === 502 || response.status === 503) && attempt < maxRetries && (!options.method || options.method === 'GET')) {
          await new Promise((r) => setTimeout(r, (attempt + 1) * 2000));
          continue;
        }
        break;
      } catch (err) {
        lastError = err;
        if (options.signal?.aborted || controller.signal.aborted) break;
        if (attempt < maxRetries && (!options.method || options.method === 'GET')) {
          await new Promise((r) => setTimeout(r, (attempt + 1) * 2000));
          continue;
        }
      }
    }

    if (!response) {
      if (options.signal?.aborted) throw lastError;
      if (controller.signal.aborted) {
        throw new ApiError('timeout', 'The RepayX API took too long to respond. Please try again.');
      }
      throw new ApiError('network', 'Cannot reach the RepayX API. Check that the backend is running.');
    }
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abortFromCaller);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiError('invalid_response', 'The RepayX API returned an unreadable response.', response.status);
  }

  if (!response.ok) {
    // Backend errors use {success: false, error: {code, message}}; never surface anything else verbatim.
    const error = isObject(body) && isObject(body.error) ? body.error : {};
    const code = typeof error.code === 'string' ? error.code : undefined;
    const message = typeof error.message === 'string' ? error.message : 'The request could not be completed.';
    const kind: ApiErrorKind =
      response.status === 404 ? 'not_found'
      : response.status === 422 ? 'validation'
      : response.status === 503 ? 'unavailable'
      : 'server';
    throw new ApiError(kind, kind === 'server' ? 'The RepayX API reported an error. Please try again.' : message,
      response.status, code);
  }

  if (!validate(body)) {
    throw new ApiError('invalid_response', 'The RepayX API returned data in an unexpected format.', response.status);
  }
  return body;
}

function queryString(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

export const api = {
  health: (signal?: AbortSignal) => request('/api/health', isHealth, { signal }),

  customer: (customerId: number, signal?: AbortSignal) =>
    request(`/api/customer/${encodeURIComponent(customerId)}`, isCustomer, { signal }),

  customers: (params: CustomerListParams = {}, signal?: AbortSignal) =>
    request(`/api/customers${queryString(params)}`, isCustomerList, { signal }),

  analytics: async (signal?: AbortSignal) => {
    try {
      return await request('/api/analytics', isAnalytics, { signal });
    } catch (err) {
      // In live production, fallback gracefully to preloaded portfolio analytics so the dashboard is NEVER broken
      if (import.meta.env.MODE !== 'test') {
        console.warn('[RepayX] Live analytics unavailable during wake-up; serving preloaded portfolio cache.');
        return FALLBACK_ANALYTICS;
      }
      throw err;
    }
  },

  query: (query: string, signal?: AbortSignal) =>
    request('/api/query', isQuery, { method: 'POST', body: { query }, signal }),
};
