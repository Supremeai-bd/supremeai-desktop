/**
 * Single logging entry point.
 *
 * - `debug` is dev-only, so production bundles stay quiet.
 * - `warn`/`error` stay in production (support needs them) and `error` also
 *   forwards to the client error reporter.
 *
 * Never use bare `console.*` in app code; this module keeps output greppable
 * and gives us one place to add sinks later.
 */

import { reportClientError } from '../services/telemetry';

type Sink = (...args: unknown[]) => void;

const PREFIX = '[supremeai]';

const isDev = ((): boolean => {
  try {
    return Boolean((import.meta as unknown as { env?: Record<string, boolean> }).env?.DEV);
  } catch {
    return false;
  }
})();

function emit(sink: Sink, args: unknown[]): void {
  try {
    sink(PREFIX, ...args);
  } catch {
    // Logging must never throw.
  }
}

export const logger = {
  debug(...args: unknown[]): void {
    if (isDev) emit(console.debug, args);
  },
  info(...args: unknown[]): void {
    emit(console.info, args);
  },
  warn(...args: unknown[]): void {
    emit(console.warn, args);
  },
  error(...args: unknown[]): void {
    emit(console.error, args);
    const [first] = args;
    const error = first instanceof Error ? first : new Error(String(first));
    const context = args.length > 1 ? { details: args.slice(1).map(String) } : {};
    reportClientError(error, context, 'logger.error');
  },
};
