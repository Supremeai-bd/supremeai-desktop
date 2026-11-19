import React, { useState } from 'react';
import { Activity, AlertTriangle, RefreshCw, WifiOff, Loader2, ChevronRight } from 'lucide-react';
import { useFederationSync, useNow } from '../../hooks/useFederationSync';
import { formatRelativeTime } from '../../utils/federationNormalize';
import { useI18n } from '../../utils/i18n';

interface SyncStatusPillProps {
  onOpen: () => void;
  compact?: boolean;
}

const TONE: Record<string, { dot: string; text: string; border: string; bg: string }> = {
  live: {
    dot: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-300/70 dark:border-emerald-500/30',
    bg: 'bg-emerald-50/80 dark:bg-emerald-500/10',
  },
  syncing: {
    dot: 'bg-sky-500',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-300/70 dark:border-sky-500/30',
    bg: 'bg-sky-50/80 dark:bg-sky-500/10',
  },
  degraded: {
    dot: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-300/70 dark:border-amber-500/30',
    bg: 'bg-amber-50/80 dark:bg-amber-500/10',
  },
  offline: {
    dot: 'bg-rose-500',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-300/70 dark:border-rose-500/30',
    bg: 'bg-rose-50/80 dark:bg-rose-500/10',
  },
  idle: {
    dot: 'bg-slate-400',
    text: 'text-slate-600 dark:text-slate-300',
    border: 'border-slate-300/70 dark:border-slate-600/40',
    bg: 'bg-white/70 dark:bg-slate-900/70',
  },
};

/**
 * Global federation health pill. Sits in the Studio chrome and links to the
 * full Live Data Fabric console. Shows honest state — never fake green.
 */
export const SyncStatusPill: React.FC<SyncStatusPillProps> = ({ onOpen, compact = false }) => {
  const { t } = useI18n();
  const now = useNow(2000);
  const { pulse, overallStatus, isPaused, isRefreshingAll } = useFederationSync();
  const [showTooltip, setShowTooltip] = useState(false);

  const tone = TONE[overallStatus] ?? TONE.idle;
  const isSyncing = overallStatus === 'syncing' || isRefreshingAll;
  const settled = pulse.online + pulse.stale + pulse.degraded;

  const label =
    overallStatus === 'live'
      ? t.syncLive
      : overallStatus === 'syncing'
        ? t.syncSyncing
        : overallStatus === 'degraded'
          ? t.syncDegraded
          : overallStatus === 'offline'
            ? t.syncOffline
            : t.syncIdle;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={onOpen}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label={t.syncOpenCenter}
        title={t.syncOpenCenter}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-medium backdrop-blur-md transition-colors cursor-pointer whitespace-nowrap ${tone.bg} ${tone.border} ${tone.text} hover:brightness-[0.98] dark:hover:bg-slate-800/80`}
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-60 ${
              isSyncing ? 'animate-ping' : ''
            } ${tone.dot}`}
          />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${tone.dot}`} />
        </span>
        {isSyncing ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : overallStatus === 'offline' ? (
          <WifiOff className="w-3 h-3" />
        ) : overallStatus === 'degraded' ? (
          <AlertTriangle className="w-3 h-3" />
        ) : (
          <Activity className="w-3 h-3" />
        )}
        <span className="hidden sm:inline">{label}</span>
        <span className="font-mono tabular-nums">
          {pulse.online}/{pulse.total || 0}
        </span>
        {pulse.averageLatencyMs !== null && !compact && (
          <span className="hidden md:inline font-mono tabular-nums opacity-70">
            {pulse.averageLatencyMs}ms
          </span>
        )}
        {isPaused && (
          <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
            {t.syncPausedTag}
          </span>
        )}
        <ChevronRight className="w-3 h-3 opacity-60" />
      </button>

      {showTooltip && (
        <div className="pointer-events-none absolute right-0 top-full mt-2 w-64 z-50 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-3 text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5">
          <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-white">
            <span>{t.syncFabricName}</span>
            <span className="font-mono text-[10px] opacity-60">{pulse.total} endpoints</span>
          </div>
          <div className="grid grid-cols-2 gap-1 font-mono tabular-nums">
            <span>
              {t.syncOnline}: {pulse.online}
            </span>
            <span>
              {t.syncDegraded}: {pulse.degraded}
            </span>
            <span>
              {t.syncStale}: {pulse.stale}
            </span>
            <span>
              {t.syncRestricted}: {pulse.restricted}
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-200/70 dark:border-slate-800">
            <span>{t.syncLastSync}</span>
            <span className="font-mono">{formatRelativeTime(pulse.lastSyncAt, now)}</span>
          </div>
          {settled === 0 && (
            <p className="text-[10px] leading-relaxed text-amber-600 dark:text-amber-400">
              {t.syncBackendUnreachable}
            </p>
          )}
          <div className="flex items-center gap-1 text-[10px] font-medium theme-accent-text">
            <RefreshCw className="w-3 h-3" />
            <span>{t.syncClickToInspect}</span>
          </div>
        </div>
      )}
    </div>
  );
};
