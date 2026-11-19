import React, { useEffect, useState } from 'react';
import { Download, Globe, Monitor, Smartphone, ExternalLink } from 'lucide-react';
import { detectRuntimeTarget, type RuntimeTarget } from '../../bridge/platform';
import {
  ALTERNATE_MONOREPO_RELEASES_URL,
  buildCounterpartShortcuts,
  DEFAULT_RELEASE_MANIFEST,
  type DownloadShortcut,
  type ReleaseManifest,
} from '../../config/releaseDownloads';

let sharedManifestCache: ReleaseManifest | null = null;
let sharedManifestPromise: Promise<ReleaseManifest> | null = null;

async function loadLatestReleaseManifest(): Promise<ReleaseManifest> {
  if (sharedManifestCache) return sharedManifestCache;
  if (!sharedManifestPromise) {
    sharedManifestPromise = fetch('/api/releases/latest', {
      headers: { Accept: 'application/json' },
    })
      .then(async (res) => {
        if (!res.ok) return DEFAULT_RELEASE_MANIFEST;
        const json = (await res.json().catch(() => null)) as ReleaseManifest | null;
        if (json && json.windowsExeUrl && json.androidApkUrl) {
          sharedManifestCache = json;
          return json;
        }
        return DEFAULT_RELEASE_MANIFEST;
      })
      .catch(() => DEFAULT_RELEASE_MANIFEST);
  }
  return sharedManifestPromise;
}

interface PlatformDownloadsCardProps {
  variant?: 'compact' | 'full' | 'banner';
  showAllPlatforms?: boolean;
  className?: string;
}

const iconForTarget = (target: DownloadShortcut['targetPlatform']) => {
  switch (target) {
    case 'android':
      return <Smartphone className="w-3.5 h-3.5 shrink-0" />;
    case 'windows':
      return <Monitor className="w-3.5 h-3.5 shrink-0" />;
    default:
      return <Globe className="w-3.5 h-3.5 shrink-0" />;
  }
};

export const PlatformDownloadsCard: React.FC<PlatformDownloadsCardProps> = ({
  variant = 'full',
  showAllPlatforms = false,
  className = '',
}) => {
  const [manifest, setManifest] = useState<ReleaseManifest>(
    sharedManifestCache || DEFAULT_RELEASE_MANIFEST
  );
  const [runtimeTarget] = useState<RuntimeTarget>(() => detectRuntimeTarget());

  useEffect(() => {
    let active = true;
    void loadLatestReleaseManifest().then((resolved) => {
      if (active) setManifest(resolved);
    });
    return () => {
      active = false;
    };
  }, []);

  const shortcuts: DownloadShortcut[] = showAllPlatforms
    ? [
        {
          id: 'web',
          targetPlatform: 'web',
          label: 'Web Studio',
          badge: 'WEB',
          description: manifest.webUrl.replace(/^https?:\/\//, ''),
          url: manifest.webUrl,
          isDirectDownload: false,
        },
        ...buildCounterpartShortcuts('web', manifest),
      ]
    : buildCounterpartShortcuts(runtimeTarget, manifest);

  const runtimeLabel =
    runtimeTarget === 'android'
      ? 'Android App'
      : runtimeTarget === 'desktop'
        ? 'Desktop App'
        : 'Web Studio';

  if (variant === 'compact') {
    return (
      <div
        className={`rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-2 space-y-1.5 ${className}`}
      >
        <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-0.5">
          <span>
            {runtimeTarget === 'web'
              ? 'Get Mobile & Desktop'
              : runtimeTarget === 'android'
                ? 'Web & Windows App'
                : 'Web & Android APK'}
          </span>
          <a
            href={manifest.releasePageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10px] text-cyan-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-0.5"
            title="View GitHub Release Assets"
          >
            v{manifest.version}
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {shortcuts.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              download={item.isDirectDownload ? true : undefined}
              className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-[var(--theme-accent)] text-[11px] font-medium text-slate-700 dark:text-slate-200 transition-colors"
              title={`${item.label} (${item.description})`}
            >
              {iconForTarget(item.targetPlatform)}
              <span className="truncate">
                {item.id === 'web'
                  ? 'Web'
                  : item.id === 'android-apk'
                    ? 'APK'
                    : 'EXE'}
              </span>
            </a>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Download className="w-4 h-4 theme-accent-text" />
            <span>SupremeAI Cross-Platform Shortcuts</span>
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Running on <strong className="text-slate-700 dark:text-slate-200">{runtimeLabel}</strong>.
            Direct installers from latest GitHub Actions build ({manifest.repo} · v{manifest.version}).
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <a
            href={manifest.releasePageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap"
          >
            <span>All Releases</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${shortcuts.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3`}>
        {shortcuts.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            download={item.isDirectDownload ? true : undefined}
            className="group flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 hover:border-[var(--theme-accent)] hover:bg-white dark:hover:bg-slate-900 transition-all"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 group-hover:text-[var(--theme-accent)] transition-colors">
                {iconForTarget(item.targetPlatform)}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="truncate">{item.label}</span>
                  <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400">
                    {item.badge}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                  {item.description}
                </div>
              </div>
            </div>
            {item.isDirectDownload ? (
              <Download className="w-4 h-4 text-slate-400 group-hover:text-[var(--theme-accent)] shrink-0" />
            ) : (
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-[var(--theme-accent)] shrink-0" />
            )}
          </a>
        ))}
      </div>

      {variant === 'full' && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
          <span>
            ARMv7 / MSI installers & source mirror:{' '}
            {manifest.androidArmv7ApkUrl && (
              <>
                <a
                  href={manifest.androidArmv7ApkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-600 dark:text-cyan-400 hover:underline font-mono"
                >
                  ARMv7 .apk
                </a>
                {' · '}
              </>
            )}
            {manifest.windowsMsiUrl && (
              <>
                <a
                  href={manifest.windowsMsiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-600 dark:text-cyan-400 hover:underline font-mono"
                >
                  Windows .msi
                </a>
                {' · '}
              </>
            )}
            <a
              href={ALTERNATE_MONOREPO_RELEASES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-600 dark:text-cyan-400 hover:underline font-mono"
            >
              Monorepo Releases
            </a>
          </span>
          <span className="font-mono text-[10px]">
            source: {manifest.provenance}
          </span>
        </div>
      )}
    </div>
  );
};
