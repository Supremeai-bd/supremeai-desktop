import { describe, expect, it } from 'vitest';
import { formatChatTimestampWithMs, formatResponseDeltaMs } from './chatTimestamp';

describe('chatTimestamp utilities', () => {
  it('formats chat timestamps with hours, minutes, seconds, and 3-digit milliseconds', () => {
    const ts = new Date(2026, 10, 16, 21, 6, 40, 42).getTime();
    const formatted = formatChatTimestampWithMs(ts, 'en-US');
    expect(formatted).toMatch(/09:06:40\.042\s*PM/i);
  });

  it('preserves trailing zero milliseconds (.000 and .500)', () => {
    const tsZero = new Date(2026, 10, 16, 8, 5, 3, 0).getTime();
    const tsHalf = new Date(2026, 10, 16, 8, 5, 3, 500).getTime();
    expect(formatChatTimestampWithMs(tsZero, 'en-US')).toMatch(/08:05:03\.000\s*AM/i);
    expect(formatChatTimestampWithMs(tsHalf, 'en-US')).toMatch(/08:05:03\.500\s*AM/i);
  });

  it('returns empty string for invalid timestamps', () => {
    expect(formatChatTimestampWithMs(Number.NaN)).toBe('');
    expect(formatChatTimestampWithMs('invalid-date')).toBe('');
  });

  it('formats sub-second, multi-second, and multi-minute response deltas accurately', () => {
    expect(formatResponseDeltaMs(1000485, 1000000)).toEqual({
      label: '(+485ms)',
      diffMs: 485,
    });
    expect(formatResponseDeltaMs(1001425, 1000000)).toEqual({
      label: '(+1.425s)',
      diffMs: 1425,
    });
    expect(formatResponseDeltaMs(1065009, 1000000)).toEqual({
      label: '(+1m 05.009s)',
      diffMs: 65009,
    });
  });

  it('returns null when sentTimestamp is missing or later than outputTimestamp', () => {
    expect(formatResponseDeltaMs(1000000, undefined)).toBeNull();
    expect(formatResponseDeltaMs(1000000, 1000500)).toBeNull();
  });
});
