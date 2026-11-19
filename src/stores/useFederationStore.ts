import { create } from 'zustand';
import {
  FederationPulse,
  FederationSnapshot,
  FederationSyncEngine,
  FederationSyncEvent,
  federationSync,
} from '../services/federationSyncService';
import { FEDERATION_SOURCES, FederationSource } from '../config/federationSources';

interface FederationState {
  snapshots: Record<string, FederationSnapshot>;
  events: FederationSyncEvent[];
  pulse: FederationPulse;
  overallStatus: 'live' | 'syncing' | 'degraded' | 'offline' | 'idle';
  isRunning: boolean;
  isPaused: boolean;
  intervalMultiplier: number;
  lastFullSyncAt: number | null;
  isRefreshingAll: boolean;
  isInitialised: boolean;

  initialise: () => void;
  refreshSource: (sourceId: string) => Promise<void>;
  refreshAll: () => Promise<void>;
  toggleSourcePause: (sourceId: string) => void;
  setPaused: (paused: boolean) => void;
  setIntervalMultiplier: (multiplier: number) => void;
  clearCache: () => void;
  exportBundle: () => ReturnType<FederationSyncEngine['exportBundle']>;
}

function readSnapshots(engine: FederationSyncEngine): Record<string, FederationSnapshot> {
  return engine.getSnapshots().reduce<Record<string, FederationSnapshot>>((acc, snapshot) => {
    acc[snapshot.sourceId] = snapshot;
    return acc;
  }, {});
}

let initialised = false;

export const useFederationStore = create<FederationState>((set, get) => ({
  snapshots: {},
  events: [],
  pulse: {
    total: FEDERATION_SOURCES.length,
    online: 0,
    stale: 0,
    degraded: 0,
    restricted: 0,
    paused: 0,
    pending: 0,
    averageLatencyMs: null,
    totalRecords: 0,
    totalBytes: 0,
    successRate: null,
    lastSyncAt: null,
    lastEventAt: null,
  },
  overallStatus: 'idle',
  isRunning: false,
  isPaused: false,
  intervalMultiplier: 1,
  lastFullSyncAt: null,
  isRefreshingAll: false,
  isInitialised: false,

  initialise: () => {
    if (initialised) {
      set((state) => (state.isInitialised ? state : { ...state, isInitialised: true }));
      return;
    }
    initialised = true;

    const pushUpdate = () => {
      const snapshots = readSnapshots(federationSync);
      set({
        snapshots,
        pulse: federationSync.getPulse(Object.values(snapshots)),
        overallStatus: federationSync.getOverallStatus(),
        events: federationSync.getEvents().slice(-40).reverse(),
        lastFullSyncAt: federationSync.getLastFullSyncAt(),
        isRunning: federationSync.isStarted(),
        isPaused: federationSync.isPaused(),
        intervalMultiplier: federationSync.getIntervalMultiplier(),
        isInitialised: true,
      });
    };

    federationSync.subscribe(() => pushUpdate());
    federationSync.subscribeEvents(() => pushUpdate());

    federationSync.start();
    pushUpdate();
  },

  refreshSource: async (sourceId) => {
    await federationSync.refresh(sourceId);
    set((state) => ({
      snapshots: readSnapshots(federationSync),
      pulse: federationSync.getPulse(),
      overallStatus: federationSync.getOverallStatus(),
      events: federationSync.getEvents().slice(-40).reverse(),
      lastFullSyncAt: federationSync.getLastFullSyncAt(),
      isInitialised: true,
      isRunning: federationSync.isStarted(),
      isPaused: state.isPaused,
    }));
  },

  refreshAll: async () => {
    set({ isRefreshingAll: true });
    try {
      await federationSync.refresh();
    } finally {
      set({
        isRefreshingAll: false,
        snapshots: readSnapshots(federationSync),
        pulse: federationSync.getPulse(),
        overallStatus: federationSync.getOverallStatus(),
        events: federationSync.getEvents().slice(-40).reverse(),
        lastFullSyncAt: federationSync.getLastFullSyncAt(),
      });
    }
  },

  toggleSourcePause: (sourceId) => {
    const snapshot = get().snapshots[sourceId];
    const isPaused = snapshot?.state === 'paused';
    if (isPaused) {
      federationSync.resumeSource(sourceId);
    } else {
      federationSync.pauseSource(sourceId);
    }
    set({
      snapshots: readSnapshots(federationSync),
      pulse: federationSync.getPulse(),
      overallStatus: federationSync.getOverallStatus(),
    });
  },

  setPaused: (paused) => {
    federationSync.setPaused(paused);
    set({
      isPaused: paused,
      snapshots: readSnapshots(federationSync),
      pulse: federationSync.getPulse(),
      overallStatus: federationSync.getOverallStatus(),
    });
  },

  setIntervalMultiplier: (multiplier) => {
    federationSync.setIntervalMultiplier(multiplier);
    set({ intervalMultiplier: federationSync.getIntervalMultiplier() });
  },

  clearCache: () => {
    try {
      localStorage.removeItem('supremeai.federation.sync.cache.v1');
    } catch {
      /* ignore */
    }
    // Force a full re-fetch so the UI reflects a true cold start.
    void get().refreshAll();
  },

  exportBundle: () => federationSync.exportBundle(),
}));

/** Convenience selector: the source definition + live snapshot for one feature. */
export function selectFederationSource(sourceId: string): {
  source: FederationSource | undefined;
  snapshot: FederationSnapshot | undefined;
  data: unknown;
} {
  const state = useFederationStore.getState();
  return {
    source: FEDERATION_SOURCES.find((item) => item.id === sourceId),
    snapshot: state.snapshots[sourceId],
    data: state.snapshots[sourceId]?.data ?? null,
  };
}
