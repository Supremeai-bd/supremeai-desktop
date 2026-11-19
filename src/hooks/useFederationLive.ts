import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFederationStore } from '../stores/useFederationStore';
import { FederationSnapshot } from '../services/federationSyncService';
import { ensureFederationFresh, freshnessBudgetMs } from '../services/federationBridge';

export interface UseFederationLiveResult<T> {
  /** Latest payload, or null when the source has not produced one yet. */
  data: T | null;
  snapshot: FederationSnapshot | undefined;
  state: FederationSnapshot['state'] | 'idle';
  /** Epoch ms of the last successful fetch. */
  updatedAt: number | null;
  ageMs: number | null;
  isFresh: boolean;
  isUnavailable: boolean;
  refresh: () => Promise<void>;
}

/**
 * Subscribes a component to one federation source.
 *
 * Use this instead of a bespoke `setInterval` poller: the engine already owns
 * cadence, backoff, ETag revalidation and visibility pausing.
 */
export function useFederationLive<T>(
  sourceId: string,
  options: { maxAgeMs?: number; enabled?: boolean } = {}
): UseFederationLiveResult<T> {
  const { maxAgeMs = freshnessBudgetMs(sourceId), enabled = true } = options;
  const snapshot = useFederationStore((state) => state.snapshots[sourceId]);
  const refreshSource = useFederationStore((state) => state.refreshSource);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return;
    void ensureFederationFresh(sourceId, maxAgeMs);
  }, [enabled, sourceId, maxAgeMs]);

  // Freshness is time-based, so recompute it on a slow tick when the engine is
  // quiet (the value only drives labels and the stale badge).
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(id);
  }, []);

  const refresh = useCallback(async () => {
    await refreshSource(sourceId);
  }, [refreshSource, sourceId]);

  const ageMs = snapshot?.fetchedAt ? Math.max(0, now - snapshot.fetchedAt) : null;
  const state: FederationSnapshot['state'] | 'idle' = snapshot?.state ?? 'idle';

  return useMemo(
    () => ({
      data: (snapshot?.data as T | undefined) ?? null,
      snapshot,
      state,
      updatedAt: snapshot?.fetchedAt ?? null,
      ageMs,
      isFresh: ageMs !== null && ageMs <= maxAgeMs,
      isUnavailable: state === 'restricted' || state === 'error' || state === 'offline',
      refresh,
    }),
    [snapshot, state, ageMs, maxAgeMs, refresh]
  );
}
