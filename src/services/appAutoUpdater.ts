import { invoke, isTauri } from '@tauri-apps/api/core';
import {
  detectPlatform,
  detectRuntimeTarget,
  openExternalDownloadUrl,
  type RuntimeTarget,
} from '../bridge/platform';
import { DEFAULT_WEB_STUDIO_URL, GITHUB_PUBLIC_REPO_SLUG } from '../config/platformEndpoints';
import {
  compareSemver,
  DEFAULT_RELEASE_MANIFEST,
  normalizeRemoteReleaseManifest,
  type ReleaseManifest,
} from '../config/releaseDownloads';

export type AutoUpdateStatus =
  | 'idle'
  | 'checking'
  | 'up-to-date'
  | 'staging'
  | 'ready'
  | 'applying'
  | 'error';

export interface AppRuntimeInfo {
  version: string;
  os: string;
  arch: string;
  isWindows: boolean;
  isAndroid: boolean;
}

export interface StagedUpdateInfo {
  filePath: string;
  fileName: string;
  sizeBytes: number;
  alreadyCached: boolean;
}

export interface ApplyUpdateResult {
  launched: boolean;
  silent: boolean;
  mode: string;
  message: string;
}

export interface AutoUpdateState {
  status: AutoUpdateStatus;
  currentVersion: string;
  latestVersion: string | null;
  runtimeTarget: RuntimeTarget;
  downloadUrl: string | null;
  stagedFilePath: string | null;
  alreadyCached: boolean;
  silentSupported: boolean;
  message: string | null;
  lastCheckedAt: number | null;
}

const initialState: AutoUpdateState = {
  status: 'idle',
  currentVersion: DEFAULT_RELEASE_MANIFEST.version,
  latestVersion: null,
  runtimeTarget: typeof window !== 'undefined' ? detectRuntimeTarget() : 'web',
  downloadUrl: null,
  stagedFilePath: null,
  alreadyCached: false,
  silentSupported: false,
  message: null,
  lastCheckedAt: null,
};

let currentState: AutoUpdateState = { ...initialState };
const listeners = new Set<(state: AutoUpdateState) => void>();
let monitorTimer: ReturnType<typeof setInterval> | null = null;
let initialCheckTimer: ReturnType<typeof setTimeout> | null = null;
let activeCheckPromise: Promise<AutoUpdateState> | null = null;

function setState(patch: Partial<AutoUpdateState>): AutoUpdateState {
  currentState = { ...currentState, ...patch };
  for (const listener of listeners) {
    listener(currentState);
  }
  return currentState;
}

export function getUpdateState(): AutoUpdateState {
  return currentState;
}

export function subscribeUpdateState(listener: (state: AutoUpdateState) => void): () => void {
  listeners.add(listener);
  listener(currentState);
  return () => {
    listeners.delete(listener);
  };
}

export async function fetchRemoteReleaseManifest(): Promise<ReleaseManifest> {
  const platform = detectPlatform();
  const endpoints =
    platform === 'tauri'
      ? [
          `${DEFAULT_WEB_STUDIO_URL}/api/releases/latest`,
          `https://github.com/${GITHUB_PUBLIC_REPO_SLUG}/releases/download/latest/latest-release.json`,
          `https://github.com/${GITHUB_PUBLIC_REPO_SLUG}/releases/download/latest/latest-desktop.json`,
        ]
      : [
          '/api/releases/latest',
          `https://github.com/${GITHUB_PUBLIC_REPO_SLUG}/releases/download/latest/latest-release.json`,
        ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) continue;
      const json = (await res.json().catch(() => null)) as any;
      if (json && typeof json.windowsExeUrl === 'string' && typeof json.androidApkUrl === 'string') {
        return json as ReleaseManifest;
      }
      const normalized = normalizeRemoteReleaseManifest(json, GITHUB_PUBLIC_REPO_SLUG);
      if (normalized) return normalized;
    } catch {
      // Try next endpoint quietly
    }
  }
  return DEFAULT_RELEASE_MANIFEST;
}

export async function checkAndStageBackgroundUpdate(force = false): Promise<AutoUpdateState> {
  if (!force && activeCheckPromise) {
    return activeCheckPromise;
  }

  activeCheckPromise = (async () => {
    const runtimeTarget = detectRuntimeTarget();
    let currentVersion = DEFAULT_RELEASE_MANIFEST.version;
    let isWindowsNative = false;
    let isAndroidNative = runtimeTarget === 'android';

    if (detectPlatform() === 'tauri' && isTauri()) {
      try {
        const info = await invoke<AppRuntimeInfo>('get_app_runtime_info');
        if (info?.version) currentVersion = info.version;
        isWindowsNative = Boolean(info?.isWindows);
        isAndroidNative = Boolean(info?.isAndroid);
      } catch {
        // Ignore if native runtime info isn't available
      }
    }

    setState({
      status: 'checking',
      currentVersion,
      runtimeTarget,
      silentSupported: isWindowsNative,
      message: null,
    });

    try {
      const manifest = await fetchRemoteReleaseManifest();
      const hasNewerVersion = compareSemver(manifest.version, currentVersion) > 0;

      if (!hasNewerVersion) {
        return setState({
          status: 'up-to-date',
          latestVersion: manifest.version,
          lastCheckedAt: Date.now(),
          message: null,
        });
      }

      if (runtimeTarget === 'desktop' && isWindowsNative && manifest.windowsExeUrl) {
        setState({
          status: 'staging',
          latestVersion: manifest.version,
          downloadUrl: manifest.windowsExeUrl,
          silentSupported: true,
          message: `Downloading v${manifest.version} quietly in background…`,
        });

        const fileName =
          manifest.windowsExeUrl.split('/').pop() ||
          `SupremeAI.Desktop_${manifest.version}_x64-setup.exe`;

        const staged = await invoke<StagedUpdateInfo>('stage_silent_update', {
          url: manifest.windowsExeUrl,
          fileName,
        });

        return setState({
          status: 'ready',
          latestVersion: manifest.version,
          downloadUrl: manifest.windowsExeUrl,
          stagedFilePath: staged.filePath,
          alreadyCached: staged.alreadyCached,
          silentSupported: true,
          lastCheckedAt: Date.now(),
          message: `v${manifest.version} downloaded quietly · ready for silent install`,
        });
      }

      if (runtimeTarget === 'android' || isAndroidNative) {
        return setState({
          status: 'ready',
          latestVersion: manifest.version,
          downloadUrl: manifest.androidApkUrl,
          stagedFilePath: null,
          silentSupported: false,
          lastCheckedAt: Date.now(),
          message: `v${manifest.version} APK ready · tap to install`,
        });
      }

      return setState({
        status: 'ready',
        latestVersion: manifest.version,
        downloadUrl: manifest.webUrl || DEFAULT_WEB_STUDIO_URL,
        silentSupported: true,
        lastCheckedAt: Date.now(),
        message: `v${manifest.version} available · refresh to load`,
      });
    } catch (err) {
      return setState({
        status: 'error',
        lastCheckedAt: Date.now(),
        message: err instanceof Error ? err.message : 'Background update check paused',
      });
    } finally {
      activeCheckPromise = null;
    }
  })();

  return activeCheckPromise;
}

export async function applyReadyUpdate(): Promise<ApplyUpdateResult | null> {
  if (currentState.status !== 'ready') return null;

  if (currentState.runtimeTarget === 'desktop' && currentState.stagedFilePath && isTauri()) {
    setState({
      status: 'applying',
      message: `Applying v${currentState.latestVersion || ''} silently…`,
    });
    try {
      const result = await invoke<ApplyUpdateResult>('apply_staged_update', {
        filePath: currentState.stagedFilePath,
      });
      setState({ message: result.message });
      return result;
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Failed to launch silent update',
      });
      return null;
    }
  }

  if (currentState.downloadUrl) {
    if (currentState.runtimeTarget === 'web') {
      window.location.reload();
      return {
        launched: true,
        silent: true,
        mode: 'web-reload',
        message: 'Reloading Web Studio to latest release.',
      };
    }
    openExternalDownloadUrl(currentState.downloadUrl);
    return {
      launched: true,
      silent: false,
      mode: 'android-apk-download',
      message: 'Opened signed APK installer download.',
    };
  }

  return null;
}

export function startBackgroundUpdateMonitor(): void {
  if (typeof window === 'undefined') return;
  if (initialCheckTimer || monitorTimer) return;

  // Wait 8 seconds after startup so UI & initial chats load with zero contention
  initialCheckTimer = setTimeout(() => {
    void checkAndStageBackgroundUpdate();
  }, 8000);

  // Silently re-check every 30 minutes
  monitorTimer = setInterval(() => {
    void checkAndStageBackgroundUpdate();
  }, 30 * 60_000);
}

export function stopBackgroundUpdateMonitor(): void {
  if (initialCheckTimer) {
    clearTimeout(initialCheckTimer);
    initialCheckTimer = null;
  }
  if (monitorTimer) {
    clearInterval(monitorTimer);
    monitorTimer = null;
  }
}
