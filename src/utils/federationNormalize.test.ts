import { describe, expect, it } from 'vitest';
import {
  approximateBytes,
  countRecords,
  formatBytes,
  formatCount,
  formatDuration,
  formatRelativeTime,
  readPath,
  summarizePayload,
} from './federationNormalize';

describe('readPath', () => {
  it('reads nested objects and array indexes', () => {
    const payload = { squad: { total_keys: 36, routes: [{ latency_ms: 120 }] } };
    expect(readPath(payload, 'squad.total_keys')).toBe(36);
    expect(readPath(payload, 'squad.routes.0.latency_ms')).toBe(120);
    expect(readPath(payload, 'squad.missing.deep')).toBeUndefined();
    expect(readPath(payload, 'squad.routes.first')).toBeUndefined();
  });
});

describe('countRecords', () => {
  it('counts arrays and explicit collection keys', () => {
    expect(countRecords([1, 2, 3])).toBe(3);
    expect(countRecords({ models: { a: 1, b: 2 } }, ['models'])).toBe(2);
    expect(countRecords({ services: [{}, {}] }, ['services'])).toBe(2);
  });

  it('falls back to generic envelopes and reported totals', () => {
    expect(countRecords({ data: [1, 2, 3, 4] })).toBe(4);
    expect(countRecords({ items: [1, 2] })).toBe(2);
    expect(countRecords({ total: 912 })).toBe(912);
  });

  it('returns null for opaque payloads', () => {
    expect(countRecords({ status: 'ok' })).toBeNull();
    expect(countRecords(null)).toBeNull();
    expect(countRecords('text')).toBeNull();
  });
});

describe('summarizePayload', () => {
  it('summarises objects with metrics and keys', () => {
    const summary = summarizePayload(
      { status: 'healthy', uptime_seconds: 12.5, components: { a: 'healthy', b: 'degraded' } },
      {
        metrics: [
          { path: 'status', label: 'Status' },
          { path: 'uptime_seconds', label: 'Uptime', unit: 's' },
        ],
      }
    );

    expect(summary.kind).toBe('object');
    expect(summary.topKeys).toEqual(['status', 'uptime_seconds', 'components']);
    expect(summary.keyCount).toBe(3);
    expect(summary.metrics).toEqual([
      { label: 'Status', value: 'healthy', unit: undefined },
      { label: 'Uptime', value: 12.5, unit: 's' },
    ]);
    expect(summary.bytes).toBeGreaterThan(0);
  });

  it('skips metrics that are missing or opaque', () => {
    const summary = summarizePayload(
      { nested: { deep: [1, 2] } },
      {
        metrics: [
          { path: 'missing', label: 'Missing' },
          { path: 'nested', label: 'Nested' },
        ],
      }
    );
    expect(summary.metrics).toEqual([{ label: 'Nested', value: '1 field(s)', unit: undefined }]);
  });

  it('labels empty payloads', () => {
    expect(summarizePayload({}).kind).toBe('empty');
    expect(summarizePayload([]).kind).toBe('empty');
    expect(summarizePayload([]).records).toBe(0);
    expect(summarizePayload('plain text').kind).toBe('text');
  });
});

describe('formatters', () => {
  it('formats bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.00 MB');
  });

  it('formats counts', () => {
    expect(formatCount(null)).toBe('—');
    expect(formatCount(42)).toBe('42');
    expect(formatCount(36_400)).toBe('36.4k');
    expect(formatCount(2_400_000)).toBe('2.4M');
  });

  it('formats durations', () => {
    expect(formatDuration(140)).toBe('140 ms');
    expect(formatDuration(2_400)).toBe('2.4 s');
    expect(formatDuration(120_000)).toBe('2.0 min');
    expect(formatDuration(null)).toBe('—');
  });

  it('formats relative times', () => {
    const now = 1_000_000;
    expect(formatRelativeTime(null, now)).toBe('never');
    expect(formatRelativeTime(now - 500, now)).toBe('just now');
    expect(formatRelativeTime(now - 12_000, now)).toBe('12s ago');
    expect(formatRelativeTime(now - 120_000, now)).toBe('2m ago');
    expect(formatRelativeTime(now - 7_200_000, now)).toBe('2h ago');
  });

  it('approximates serialised size safely', () => {
    expect(approximateBytes(undefined)).toBe(0);
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(approximateBytes(cyclic)).toBe(0);
    expect(approximateBytes({ a: 1 })).toBeGreaterThan(0);
  });
});
