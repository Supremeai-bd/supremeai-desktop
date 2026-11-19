/**
 * Federation → feature bridge.
 *
 * Feature code should not call endpoints that the sync engine already owns.
 * These helpers let a service or store read the engine's snapshot instead of
 * issuing a second request for the same data, and let an explicit user action
 * force a refresh when a snapshot is older than its cadence allows.
 *
 * Reads go straight to the engine (source of truth); React components should
 * subscribe through `useFederationLive` so they re-render on sync ticks.
 */

import { FEDERATION_SOURCE_MAP } from '../config/federationSources';
import { FederationSnapshot, federationSync } from './federationSyncService';

/** Default staleness budget: 1.5× the source cadence. */
export function freshnessBudgetMs(sourceId: string): number {
  const interval = FEDERATION_SOURCE_MAP[sourceId]?.intervalMs ?? 30_000;
  return Math.round(interval * 1.5);
}

export function getFederationSnapshot(sourceId: string): FederationSnapshot | undefined {
  return federationSync.getSnapshots().find((snapshot) => snapshot.sourceId === sourceId);
}

/** Snapshot payload, or `null` when the source has never produced one. */
export function getFederationData<T>(sourceId: string): T | null {
  const snapshot = getFederationSnapshot(sourceId);
  return (snapshot?.data as T | undefined) ?? null;
}

export function getFederationAgeMs(sourceId: string, now: number = Date.now()): number | null {
  const fetchedAt = getFederationSnapshot(sourceId)?.fetchedAt ?? null;
  return fetchedAt === null ? null : Math.max(0, now - fetchedAt);
}

export function isFederationFresh(
  sourceId: string,
  maxAgeMs: number = freshnessBudgetMs(sourceId),
  now: number = Date.now()
): boolean {
  const age = getFederationAgeMs(sourceId, now);
  return age !== null && age <= maxAgeMs;
}

/**
 * Refresh a source when its snapshot is missing or past its budget. Fail-open:
 * a failed refresh leaves the previous snapshot in place and never throws, so
 * callers can `await` it on a render path safely.
 */
export async function ensureFederationFresh(
  sourceId: string,
  maxAgeMs: number = freshnessBudgetMs(sourceId)
): Promise<void> {
  if (isFederationFresh(sourceId, maxAgeMs)) return;
  if (!FEDERATION_SOURCE_MAP[sourceId]) return;
  try {
    await federationSync.refresh(sourceId);
  } catch {
    // Engine already records the failure in the snapshot; nothing to do here.
  }
}

/**
 * Pulls a collection out of the shapes the gateway uses: a bare array, or an
 * object envelope such as `{ pending: [...] }` / `{ services: [...] }`.
 */
export function unwrapCollection<T>(payload: unknown, collectionKeys: string[] = []): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (!payload || typeof payload !== 'object') return [];

  const record = payload as Record<string, unknown>;
  for (const key of collectionKeys) {
    const value = record[key];
    if (Array.isArray(value)) return value as T[];
  }
  return [];
}
