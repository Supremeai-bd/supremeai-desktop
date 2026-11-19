/**
 * Minimal, fail-open client error reporter.
 *
 * Every report is best effort: nothing here may throw, block a render, or
 * retry. The endpoint accepts 204 and simply logs at the edge, so an outage
 * never turns into a user-visible error.
 */

interface ClientErrorReport {
  message: string;
  stack?: string;
  source?: string;
  release?: string;
  url?: string;
  route?: string;
  context?: Record<string, unknown>;
  at: string;
}

const ENDPOINT = '/api/telemetry/client-error';
const MAX_PER_WINDOW = 10;
const WINDOW_MS = 60_000;

const recent = new Map<string, number>();

function isEnabled(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const mode = (import.meta as unknown as { env?: Record<string, string> }).env?.MODE;
    return mode !== 'test';
  } catch {
    return false;
  }
}

function fingerprint(report: ClientErrorReport): string {
  return `${report.message.slice(0, 120)}::${report.source ?? ''}`;
}

function withinBudget(key: string, now: number): boolean {
  for (const [seen, at] of recent) {
    if (now - at > WINDOW_MS) recent.delete(seen);
  }
  const count = [...recent.keys()].filter((seen) => seen.startsWith(key)).length;
  if (count >= MAX_PER_WINDOW) return false;
  recent.set(`${key}::${now}::${Math.random()}`, now);
  return true;
}

/** Reports a handled error (ErrorBoundary, service catch blocks, etc.). */
export function reportClientError(
  error: unknown,
  context: Record<string, unknown> = {},
  source = 'app'
): void {
  if (!isEnabled()) return;

  const normalized = error instanceof Error ? error : new Error(String(error));
  const report: ClientErrorReport = {
    message: normalized.message || 'Unknown client error',
    stack: normalized.stack?.slice(0, 4000),
    source,
    release: (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_RELEASE,
    url: window.location.href,
    route: window.location.hash.replace(/^#/, '') || '/',
    context,
    at: new Date().toISOString(),
  };

  if (!withinBudget(fingerprint(report), Date.now())) return;

  try {
    const body = JSON.stringify(report);
    // `keepalive` lets the request finish even if the tab is closing.
    void fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Never let telemetry break the app.
  }
}

/** Installs `error` + `unhandledrejection` listeners exactly once. */
export function installGlobalErrorHandlers(): void {
  if (!isEnabled() || typeof window === 'undefined') return;
  const flag = '__supremeaiErrorHandlersInstalled';
  const target = window as unknown as Record<string, boolean>;
  if (target[flag]) return;
  target[flag] = true;

  window.addEventListener('error', (event) => {
    reportClientError(event.error ?? event.message, {
      kind: 'window.error',
      filename: event.filename,
      line: event.lineno,
      column: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    reportClientError(event.reason, { kind: 'unhandledrejection' });
  });
}
