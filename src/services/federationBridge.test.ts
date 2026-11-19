import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ensureFederationFresh,
  freshnessBudgetMs,
  getFederationAgeMs,
  getFederationData,
  getFederationSnapshot,
  isFederationFresh,
  unwrapCollection,
} from './federationBridge';
import { FederationSnapshot, federationSync } from './federationSyncService';

function fakeSnapshot(
  sourceId: string,
  fetchedAt: number | null,
  data: unknown
): FederationSnapshot {
  return {
    sourceId,
    state: fetchedAt ? 'ok' : 'idle',
    data,
    fetchedAt,
    attemptedAt: fetchedAt,
    latencyMs: 12,
    httpStatus: 200,
    error: null,
    consecutiveFailures: 0,
    nextSyncAt: null,
    summary: {
      kind: 'object',
      records: Array.isArray(data) ? data.length : null,
      topKeys: [],
      metrics: [],
      bytes: 0,
      keyCount: 0,
    },
    transport: 'network',
    etag: null,
    latencyHistory: [],
  } as FederationSnapshot;
}

function seed(snapshots: FederationSnapshot[]) {
  vi.spyOn(federationSync, 'getSnapshots').mockReturnValue(snapshots);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('federationBridge reads', () => {
  it('returns the payload of a known source and null for an unknown one', () => {
    seed([fakeSnapshot('mcp-tower', Date.now(), { services: [{ id: 'a' }] })]);

    expect(getFederationData<{ services: unknown[] }>('mcp-tower')).toEqual({
      services: [{ id: 'a' }],
    });
    expect(getFederationData('nope')).toBeNull();
    expect(getFederationSnapshot('nope')).toBeUndefined();
  });

  it('reports age and respects the freshness budget', () => {
    const now = 1_000_000;
    seed([fakeSnapshot('platform-config', now - 10_000, { ok: true })]);

    expect(getFederationAgeMs('platform-config', now)).toBe(10_000);
    expect(isFederationFresh('platform-config', 30_000, now)).toBe(true);
    expect(isFederationFresh('platform-config', 5_000, now)).toBe(false);
    expect(getFederationAgeMs('never-fetched', now)).toBeNull();
    expect(isFederationFresh('never-fetched', 30_000, now)).toBe(false);
  });

  it('derives the default budget from the source cadence (1.5x)', () => {
    // platform-config polls every 60s in the registry
    expect(freshnessBudgetMs('platform-config')).toBe(90_000);
    // unknown sources fall back to 30s * 1.5
    expect(freshnessBudgetMs('does-not-exist')).toBe(45_000);
  });
});

describe('ensureFederationFresh', () => {
  it('does not refresh a fresh snapshot', async () => {
    seed([fakeSnapshot('mcp-tower', Date.now(), { services: [] })]);
    const refresh = vi.spyOn(federationSync, 'refresh').mockResolvedValue(undefined);

    await ensureFederationFresh('mcp-tower', 60_000);

    expect(refresh).not.toHaveBeenCalled();
  });

  it('refreshes a stale snapshot', async () => {
    seed([fakeSnapshot('mcp-tower', Date.now() - 600_000, { services: [] })]);
    const refresh = vi.spyOn(federationSync, 'refresh').mockResolvedValue(undefined);

    await ensureFederationFresh('mcp-tower', 60_000);

    expect(refresh).toHaveBeenCalledWith('mcp-tower');
  });

  it('ignores unknown sources and swallows refresh failures', async () => {
    seed([]);
    const refresh = vi.spyOn(federationSync, 'refresh').mockRejectedValue(new Error('boom'));

    await expect(ensureFederationFresh('does-not-exist')).resolves.toBeUndefined();
    expect(refresh).not.toHaveBeenCalled();

    await expect(ensureFederationFresh('mcp-tower')).resolves.toBeUndefined();
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

describe('unwrapCollection', () => {
  it('handles bare arrays, envelopes and empty payloads', () => {
    expect(unwrapCollection([1, 2], ['services'])).toEqual([1, 2]);
    expect(unwrapCollection({ services: [1, 2] }, ['services'])).toEqual([1, 2]);
    expect(unwrapCollection({ pending: [{ id: 'p' }] }, ['services', 'pending'])).toEqual([
      { id: 'p' },
    ]);
    expect(unwrapCollection({ unrelated: [] }, ['services'])).toEqual([]);
    expect(unwrapCollection(null, ['services'])).toEqual([]);
    expect(unwrapCollection('text', ['services'])).toEqual([]);
  });
});
