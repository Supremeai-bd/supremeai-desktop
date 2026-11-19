import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpError, fetchJson, fetchWithTimeout } from './http';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('fetchWithTimeout', () => {
  it('passes the request through and returns the response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', fetchMock);

    const response = await fetchWithTimeout('/api/health', { method: 'GET' });

    expect(await response.text()).toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('maps a timeout to a retryable HttpError(408)', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_input: RequestInfo | URL, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              const error = new Error('aborted');
              error.name = 'AbortError';
              reject(error);
            });
          })
      )
    );

    const promise = fetchWithTimeout('/api/slow', { timeoutMs: 50 });
    const assertion = expect(promise).rejects.toMatchObject({ status: 408, retryable: true });
    await vi.advanceTimersByTimeAsync(60);
    await assertion;
  });

  it('maps network failures to HttpError(0)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(fetchWithTimeout('/api/offline')).rejects.toBeInstanceOf(HttpError);
    await expect(fetchWithTimeout('/api/offline')).rejects.toMatchObject({
      status: 0,
      retryable: true,
    });
  });
});

describe('fetchJson', () => {
  it('decodes JSON and returns the parsed body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ services: [1, 2] })));

    await expect(fetchJson('/api/mcp-tower/services')).resolves.toEqual({ services: [1, 2] });
  });

  it('rejects non-2xx with the server error message and body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ error: 'upstream unreachable' }, 502)));

    await expect(fetchJson('/api/platform/config')).rejects.toMatchObject({
      name: 'HttpError',
      status: 502,
      message: 'upstream unreachable',
      retryable: true,
    });
  });

  it('treats 204 and empty bodies as undefined', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(fetchJson('/api/telemetry/client-error')).resolves.toBeUndefined();
  });

  it('rejects a 200 response that is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>spa</html>')));

    await expect(fetchJson('/api/models')).rejects.toMatchObject({
      name: 'HttpError',
      message: 'Response was not valid JSON',
    });
  });
});
