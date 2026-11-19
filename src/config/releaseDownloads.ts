import type { RuntimeTarget } from '../bridge/platform';
import {
  DEFAULT_WEB_STUDIO_URL,
  GITHUB_MONOREPO_SLUG,
  GITHUB_PUBLIC_REPO_SLUG,
} from './platformEndpoints';

export interface ReleaseAssetEntry {
  platform: 'web' | 'windows-exe' | 'windows-msi' | 'android-apk-arm64' | 'android-apk-armv7';
  label: string;
  fileName: string;
  url: string;
  sizeBytes?: number;
}

export interface ReleaseManifest {
  version: string;
  tag: string;
  repo: string;
  publishedAt: string;
  releasePageUrl: string;
  webUrl: string;
  windowsExeUrl: string;
  windowsMsiUrl?: string;
  androidApkUrl: string;
  androidArmv7ApkUrl?: string;
  provenance: 'live-github' | 'manifest' | 'fallback';
  assets: ReleaseAssetEntry[];
}

export interface DownloadShortcut {
  id: 'web' | 'android-apk' | 'windows-exe' | 'release-page';
  targetPlatform: 'web' | 'android' | 'windows' | 'releases';
  label: string;
  badge: string;
  description: string;
  url: string;
  isDirectDownload: boolean;
}

const PUBLIC_RELEASES_BASE = `https://github.com/${GITHUB_PUBLIC_REPO_SLUG}/releases`;
const MONOREPO_RELEASES_BASE = `https://github.com/${GITHUB_MONOREPO_SLUG}/releases`;

export const DEFAULT_RELEASE_MANIFEST: ReleaseManifest = {
  version: '2.5.0',
  tag: 'latest',
  repo: GITHUB_PUBLIC_REPO_SLUG,
  publishedAt: '',
  releasePageUrl: `${PUBLIC_RELEASES_BASE}/latest`,
  webUrl: DEFAULT_WEB_STUDIO_URL,
  windowsExeUrl: `${PUBLIC_RELEASES_BASE}/latest/download/SupremeAI-Studio_2.5.0_x64-setup.exe`,
  windowsMsiUrl: `${PUBLIC_RELEASES_BASE}/latest/download/SupremeAI-Studio_2.5.0_x64_en-US.msi`,
  androidApkUrl: `${PUBLIC_RELEASES_BASE}/latest/download/SupremeAI-Studio-arm64-release.apk`,
  androidArmv7ApkUrl: `${PUBLIC_RELEASES_BASE}/latest/download/SupremeAI-Studio-armv7-release.apk`,
  provenance: 'fallback',
  assets: [
    {
      platform: 'android-apk-arm64',
      label: 'Android APK (ARM64)',
      fileName: 'SupremeAI-Studio-arm64-release.apk',
      url: `${PUBLIC_RELEASES_BASE}/latest/download/SupremeAI-Studio-arm64-release.apk`,
    },
    {
      platform: 'android-apk-armv7',
      label: 'Android APK (ARMv7)',
      fileName: 'SupremeAI-Studio-armv7-release.apk',
      url: `${PUBLIC_RELEASES_BASE}/latest/download/SupremeAI-Studio-armv7-release.apk`,
    },
    {
      platform: 'windows-exe',
      label: 'Windows Installer (.exe)',
      fileName: 'SupremeAI-Studio_2.5.0_x64-setup.exe',
      url: `${PUBLIC_RELEASES_BASE}/latest/download/SupremeAI-Studio_2.5.0_x64-setup.exe`,
    },
    {
      platform: 'windows-msi',
      label: 'Windows MSI (.msi)',
      fileName: 'SupremeAI-Studio_2.5.0_x64_en-US.msi',
      url: `${PUBLIC_RELEASES_BASE}/latest/download/SupremeAI-Studio_2.5.0_x64_en-US.msi`,
    },
  ],
};

export const ALTERNATE_MONOREPO_RELEASES_URL = `${MONOREPO_RELEASES_BASE}/latest`;

/**
 * Returns the exact cross-platform shortcut links requested for each runtime:
 *  - Web: Android (.apk) + Windows (.exe)
 *  - Android APK: Web URL + Windows (.exe)
 *  - Desktop EXE: Web URL + Android (.apk)
 */
export function buildCounterpartShortcuts(
  runtimeTarget: RuntimeTarget,
  manifest: ReleaseManifest = DEFAULT_RELEASE_MANIFEST
): DownloadShortcut[] {
  const webShortcut: DownloadShortcut = {
    id: 'web',
    targetPlatform: 'web',
    label: 'Open Web Studio',
    badge: 'WEB',
    description: manifest.webUrl.replace(/^https?:\/\//, ''),
    url: manifest.webUrl || DEFAULT_WEB_STUDIO_URL,
    isDirectDownload: false,
  };

  const apkShortcut: DownloadShortcut = {
    id: 'android-apk',
    targetPlatform: 'android',
    label: 'Android APK',
    badge: '.APK',
    description: `v${manifest.version} · ARM64 signed`,
    url: manifest.androidApkUrl || DEFAULT_RELEASE_MANIFEST.androidApkUrl,
    isDirectDownload: true,
  };

  const exeShortcut: DownloadShortcut = {
    id: 'windows-exe',
    targetPlatform: 'windows',
    label: 'Windows App',
    badge: '.EXE',
    description: `v${manifest.version} · x64 NSIS setup`,
    url: manifest.windowsExeUrl || DEFAULT_RELEASE_MANIFEST.windowsExeUrl,
    isDirectDownload: true,
  };

  if (runtimeTarget === 'android') {
    return [webShortcut, exeShortcut];
  }

  if (runtimeTarget === 'desktop') {
    return [webShortcut, apkShortcut];
  }

  // Web & extension: provide both Android APK and Windows EXE direct installers
  return [apkShortcut, exeShortcut];
}
