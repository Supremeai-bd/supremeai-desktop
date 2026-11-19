import { useEffect, useState } from 'react';
import { useFederationStore } from '../stores/useFederationStore';
import { FederationSnapshot } from '../services/federationSyncService';

/**
 * Boots the federation sync fabric once per app session and exposes the live
 * snapshot map. Safe to call from multiple components — the store guards
 * against duplicate engine starts.
 */
export function useFederationSync(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;
  const initialise = useFederationStore((s) => s.initialise);
  const snapshots = useFederationStore((s) => s.snapshots);
  const events = useFederationStore((s) => s.events);
  const pulse = useFederationStore((s) => s.pulse);
  const overallStatus = useFederationStore((s) => s.overallStatus);
  const isPaused = useFederationStore((s) => s.isPaused);
  const isRefreshingAll = useFederationStore((s) => s.isRefreshingAll);
  const intervalMultiplier = useFederationStore((s) => s.intervalMultiplier);

  useEffect(() => {
    if (enabled) initialise();
  }, [enabled, initialise]);

  return {
    snapshots,
    events,
    pulse,
    overallStatus,
    isPaused,
    isRefreshingAll,
    intervalMultiplier,
  };
}

/**
 * Boot the engine without subscribing the caller to sync events. Use this at
 * the app shell so sync ticks never re-render the whole workspace tree.
 */
export function useFederationBootstrap(enabled = true): void {
  const initialise = useFederationStore((s) => s.initialise);
  useEffect(() => {
    if (enabled) initialise();
  }, [enabled, initialise]);
}

/** Single-source selector with a stable object identity per update. */
export function useFederationSource(sourceId: string): FederationSnapshot | undefined {
  return useFederationStore((s) => s.snapshots[sourceId]);
}

/**
 * Ticking clock used by relative-time labels so "12s ago" stays honest without
 * forcing the sync engine to re-render on every second.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
