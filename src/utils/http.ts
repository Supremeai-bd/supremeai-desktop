/**
 * Small, dependency-free HTTP helper for call sites that need a raw
 * `fetch` (streaming, uploads, third-party APIs) but still want the
 * timeout/error semantics of `apiClient`.
 *
 * Use `apiClient` for JSON `/api/**` calls; use this when you need the
 * `Response` itself. Every request gets a hard timeout and a typed error.
 */

export interface HttpRequestOptions extends Omit<RequestInit, 'signal'> {
  /** Hard timeout; defaults to 15s. */
  timeoutMs?: number;
  /** Optional caller signal, combined with the timeout. */
  signal?: AbortSignal;
}

export class HttpError extends Error {
  public readonly status: number;
  public readonly url: string;
  public readonly retryable: boolean;
  public readonly body?: unknown;

  constructor(message: string, status: number, url: string, body?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.url = url;
    this.retryable = status === 0 || status === 408 || status === 429 || status >= 500;
    this.body = body;
  }
}

/**
 * `fetch` with a hard timeout. The returned response is untouched, so callers
 * can stream `response.body` (SSE) exactly as before.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  options: HttpRequestOptions = {}
): Promise<Response> {
  const { timeoutMs = 15_000, signal, ...init } = options;
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      const timedOut = !signal?.aborted;
      throw new HttpError(
        timedOut ? `Request timed out after ${timeoutMs}ms` : 'Request aborted',
        timedOut ? 408 : 0,
        url
      );
    }
    throw new HttpError(error instanceof Error ? error.message : 'Network request failed', 0, url);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

const EMPTY_STATUSES = new Set([204, 205, 304]);

/** `fetchWithTimeout` + JSON decoding + non-2xx rejection. */
export async function fetchJson<T = unknown>(
  input: RequestInfo | URL,
  options: HttpRequestOptions = {}
): Promise<T> {
  const response = await fetchWithTimeout(input, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = undefined;
    }
    const message =
      (body &&
        typeof body === 'object' &&
        'error' in body &&
        String((body as { error: unknown }).error)) ||
      `HTTP ${response.status} ${response.statusText}`;
    throw new HttpError(String(message), response.status, url, body);
  }

  if (EMPTY_STATUSES.has(response.status)) return undefined as T;

  const text = await response.text();
  if (!text) return undefined as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError('Response was not valid JSON', response.status, url, text.slice(0, 500));
  }
}
