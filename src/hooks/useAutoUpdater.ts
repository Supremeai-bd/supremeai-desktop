import { useCallback, useEffect, useState } from 'react';
import {
  applyReadyUpdate,
  checkAndStageBackgroundUpdate,
  DEFAULT_UPDATE_POLL_INTERVAL_MS,
  dismissPendingUpdate,
  getUpdateState,
  startBackgroundUpdateMonitor,
  stopBackgroundUpdateMonitor,
  subscribeUpdateState,
  type ApplyUpdateResult,
  type AutoUpdateState,
} from '../services/appAutoUpdater';

export interface UseAutoUpdaterOptions {
  /** Whether mounting this hook should own starting/stopping the periodic background poll timer. */
  autoStart?: boolean;
  /** Polling cadence in milliseconds (defaults to 15 minutes). */
  intervalMs?: number;
}

export interface UseAutoUpdaterResult extends AutoUpdateState {
  checkNow: () => Promise<AutoUpdateState>;
  applyUpdate: () => Promise<ApplyUpdateResult | null>;
  dismissUpdate: () => Promise<void>;
}

/**
 * Periodically checks SupremeAI's GitHub release tag/version against the baked-in `version.json`.
 * When a newer release is found, downloads the installer/assets silently onto the user's device
 * so the new version is active on next startup (or via instant apply).
 */
export function useAutoUpdater(options: UseAutoUpdaterOptions = {}): UseAutoUpdaterResult {
  const { autoStart = true, intervalMs = DEFAULT_UPDATE_POLL_INTERVAL_MS } = options;
  const [state, setState] = useState<AutoUpdateState>(() => getUpdateState());

  useEffect(() => {
    const unsubscribe = subscribeUpdateState(setState);
    if (autoStart) {
      startBackgroundUpdateMonitor(intervalMs);
    }
    return () => {
      unsubscribe();
      if (autoStart) {
        stopBackgroundUpdateMonitor();
      }
    };
  }, [autoStart, intervalMs]);

  const checkNow = useCallback(() => checkAndStageBackgroundUpdate(true), []);
  const applyUpdate = useCallback(() => applyReadyUpdate(), []);
  const dismissUpdate = useCallback(() => dismissPendingUpdate(), []);

  return {
    ...state,
    checkNow,
    applyUpdate,
    dismissUpdate,
  };
}
