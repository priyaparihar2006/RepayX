import { vi } from 'vitest';

export interface FakeResponse {
  status?: number;
  body: unknown;
}

export interface RecordedCall {
  method: string;
  path: string;
  params: URLSearchParams;
  body: unknown;
}

type Handler = (call: RecordedCall) => FakeResponse | Promise<FakeResponse>;

/**
 * Replaces fetch with a fake RepayX API. Handlers are keyed by "METHOD /path" (no query string).
 * Unmatched requests get a 404 in the backend's error format. Returns the list of recorded calls.
 */
export function installFakeApi(handlers: Record<string, Handler | FakeResponse>): RecordedCall[] {
  const calls: RecordedCall[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://api.test');
    const call: RecordedCall = {
      method: init?.method ?? 'GET',
      path: url.pathname,
      params: url.searchParams,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    };
    calls.push(call);
    const handler = handlers[`${call.method} ${call.path}`];
    const result: FakeResponse = !handler
      ? { status: 404, body: { success: false, error: { code: 'not_found', message: 'Not Found' } } }
      : typeof handler === 'function' ? await handler(call) : handler;
    return new Response(JSON.stringify(result.body), {
      status: result.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }));
  return calls;
}

/** fetch that fails the way a browser does when the backend is not running. */
export function installUnreachableApi() {
  vi.stubGlobal('fetch', vi.fn(async () => {
    throw new TypeError('Failed to fetch');
  }));
}
