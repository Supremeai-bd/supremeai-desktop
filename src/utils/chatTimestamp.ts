/**
 * Utilities for formatting chat message timestamps with millisecond precision
 * and computing exact send-to-output latency deltas.
 */

export function formatChatTimestampWithMs(
  timestamp: number | string | Date,
  locale?: string
): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';

  try {
    const formatted = date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
    if (formatted) return formatted;
  } catch {
    // Fallback below if runtime lacks fractionalSecondDigits support
  }

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${ms}`;
}

export function formatResponseDeltaMs(
  outputTimestamp: number,
  sentTimestamp?: number
): { label: string; diffMs: number } | null {
  if (
    typeof outputTimestamp !== 'number' ||
    typeof sentTimestamp !== 'number' ||
    !Number.isFinite(outputTimestamp) ||
    !Number.isFinite(sentTimestamp)
  ) {
    return null;
  }

  const diffMs = Math.round(outputTimestamp - sentTimestamp);
  if (diffMs < 0) return null;

  if (diffMs < 1000) {
    return { label: `(+${diffMs}ms)`, diffMs };
  }
  if (diffMs < 60_000) {
    return { label: `(+${(diffMs / 1000).toFixed(3)}s)`, diffMs };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = String(totalSeconds % 60).padStart(2, '0');
  const remMs = String(diffMs % 1000).padStart(3, '0');
  return { label: `(+${mins}m ${secs}.${remMs}s)`, diffMs };
}
