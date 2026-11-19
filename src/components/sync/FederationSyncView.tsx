import React, { useMemo, useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bot,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  Download,
  Gauge,
  HardDrive,
  Info,
  Loader2,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Search,
  Server,
  ShieldAlert,
  Sparkles,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import {
  FEDERATION_GROUPS,
  FEDERATION_REPO,
  FEDERATION_SOURCE_MAP,
  FEDERATION_STUDIO_REPO,
  FEDERATION_TIERS,
  SOURCE_GROUP_META,
  FederationAuthClass,
  FederationSource,
  getSourcesByGroup,
  getSourcesByTier,
} from '../../config/federationSources';
import { useFederationSync, useNow } from '../../hooks/useFederationSync';
import { useFederationStore } from '../../stores/useFederationStore';
import { FederationSnapshot, FederationSourceState } from '../../services/federationSyncService';
import {
  formatBytes,
  formatCount,
  formatDuration,
  formatRelativeTime,
} from '../../utils/federationNormalize';
import { useI18n } from '../../utils/i18n';

/* ------------------------------------------------------------------ helpers */

const ACCENT: Record<string, { text: string; bg: string; ring: string; dot: string }> = {
  emerald: {
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10',
    ring: 'ring-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  blue: {
    text: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-500/10',
    ring: 'ring-sky-500/20',
    dot: 'bg-sky-500',
  },
  violet: {
    text: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-500/10',
    ring: 'ring-violet-500/20',
    dot: 'bg-violet-500',
  },
  amber: {
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10',
    ring: 'ring-amber-500/20',
    dot: 'bg-amber-500',
  },
  fuchsia: {
    text: 'text-fuchsia-600 dark:text-fuchsia-400',
    bg: 'bg-fuchsia-500/10',
    ring: 'ring-fuchsia-500/20',
    dot: 'bg-fuchsia-500',
  },
  cyan: {
    text: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-500/10',
    ring: 'ring-cyan-500/20',
    dot: 'bg-cyan-500',
  },
  slate: {
    text: 'text-slate-600 dark:text-slate-300',
    bg: 'bg-slate-500/10',
    ring: 'ring-slate-500/20',
    dot: 'bg-slate-400',
  },
};

const STATE_STYLE: Record<
  FederationSourceState,
  { dot: string; text: string; chip: string; labelKey: string }
> = {
  ok: {
    dot: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    chip: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300',
    labelKey: 'syncStateLive',
  },
  stale: {
    dot: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    chip: 'bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-300',
    labelKey: 'syncStateStale',
  },
  syncing: {
    dot: 'bg-sky-500',
    text: 'text-sky-600 dark:text-sky-400',
    chip: 'bg-sky-500/10 border-sky-500/25 text-sky-700 dark:text-sky-300',
    labelKey: 'syncStateSyncing',
  },
  error: {
    dot: 'bg-rose-500',
    text: 'text-rose-600 dark:text-rose-400',
    chip: 'bg-rose-500/10 border-rose-500/25 text-rose-700 dark:text-rose-300',
    labelKey: 'syncStateError',
  },
  offline: {
    dot: 'bg-slate-500',
    text: 'text-slate-600 dark:text-slate-300',
    chip: 'bg-slate-500/10 border-slate-500/25 text-slate-700 dark:text-slate-300',
    labelKey: 'syncStateOffline',
  },
  restricted: {
    dot: 'bg-indigo-500',
    text: 'text-indigo-600 dark:text-indigo-400',
    chip: 'bg-indigo-500/10 border-indigo-500/25 text-indigo-700 dark:text-indigo-300',
    labelKey: 'syncStateRestricted',
  },
  unsupported: {
    dot: 'bg-slate-400',
    text: 'text-slate-500 dark:text-slate-400',
    chip: 'bg-slate-500/10 border-slate-500/25 text-slate-600 dark:text-slate-300',
    labelKey: 'syncStateUnsupported',
  },
  paused: {
    dot: 'bg-slate-400',
    text: 'text-slate-500 dark:text-slate-400',
    chip: 'bg-slate-500/10 border-slate-500/25 text-slate-600 dark:text-slate-300',
    labelKey: 'syncStatePaused',
  },
  idle: {
    dot: 'bg-slate-400',
    text: 'text-slate-500 dark:text-slate-400',
    chip: 'bg-slate-500/10 border-slate-500/25 text-slate-600 dark:text-slate-300',
    labelKey: 'syncStateIdle',
  },
};

const AUTH_KEY: Record<FederationAuthClass, string> = {
  public: 'syncAuthPublic',
  key: 'syncAuthKey',
  user: 'syncAuthUser',
  admin: 'syncAuthAdmin',
};

function copyToClipboard(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return Promise.resolve();
}

function safeJson(payload: unknown, maxChars = 60_000): string {
  try {
    const text = JSON.stringify(payload, null, 2);
    return typeof text === 'string' ? text.slice(0, maxChars) : '// payload not serialisable';
  } catch {
    return '// payload contains a cycle and cannot be serialised';
  }
}

function downloadJson(filename: string, payload: unknown): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

const Sparkline: React.FC<{ values: number[]; className?: string }> = ({ values, className }) => {
  if (!values || values.length < 2) {
    return (
      <div className={`h-6 flex items-center text-[10px] text-slate-400 ${className || ''}`}>—</div>
    );
  }
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = Math.max(1, max - min);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 26 - ((value - min) / span) * 22;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className={`w-16 h-6 ${className || ''}`}>
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const KpiCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}> = ({ icon, label, value, hint, tone }) => (
  <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm p-3.5">
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <span className={tone || 'text-slate-400 dark:text-slate-500'}>{icon}</span>
    </div>
    <div className="mt-1.5 text-xl font-bold tabular-nums text-slate-900 dark:text-white font-mono">
      {value}
    </div>
    {hint && <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{hint}</div>}
  </div>
);

/* ------------------------------------------------------------------ view */

export const FederationSyncView: React.FC = () => {
  const { t } = useI18n();
  const now = useNow(1000);
  const { snapshots, events, pulse, overallStatus, isPaused, isRefreshingAll, intervalMultiplier } =
    useFederationSync();

  const refreshSource = useFederationStore((s) => s.refreshSource);
  const refreshAll = useFederationStore((s) => s.refreshAll);
  const toggleSourcePause = useFederationStore((s) => s.toggleSourcePause);
  const setPaused = useFederationStore((s) => s.setPaused);
  const setIntervalMultiplier = useFederationStore((s) => s.setIntervalMultiplier);
  const exportBundle = useFederationStore((s) => s.exportBundle);
  const clearCache = useFederationStore((s) => s.clearCache);

  const [inspectId, setInspectId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'live' | 'attention'>('all');
  const [viewMode, setViewMode] = useState<'tier' | 'subsystem'>('tier');
  const [copied, setCopied] = useState(false);

  const stateLabel = (state: FederationSourceState): string =>
    (t as Record<string, string>)[STATE_STYLE[state]?.labelKey || 'syncStateIdle'] || state;

  const matches = (source: FederationSource, snapshot?: FederationSnapshot): boolean => {
    const needle = query.trim().toLowerCase();
    const matchesQuery =
      !needle ||
      source.feature.toLowerCase().includes(needle) ||
      source.label.toLowerCase().includes(needle) ||
      source.path.toLowerCase().includes(needle) ||
      source.group.toLowerCase().includes(needle) ||
      `tier ${source.tier}`.includes(needle) ||
      `tier-${source.tier}`.includes(needle);

    if (!matchesQuery) return false;
    if (filter === 'all') return true;
    const state = snapshot?.state ?? 'idle';
    if (filter === 'live') return state === 'ok';
    return ['stale', 'error', 'offline', 'unsupported', 'restricted'].includes(state);
  };

  const filteredTiers = useMemo(
    () =>
      FEDERATION_TIERS.map((tierMeta) => {
        const sources = getSourcesByTier(tierMeta.tier).filter((source) =>
          matches(source, snapshots[source.id])
        );
        return { tierMeta, sources };
      }).filter((entry) => entry.sources.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query, filter, snapshots]
  );

  const filteredGroups = useMemo(
    () =>
      FEDERATION_GROUPS.map((group) => {
        const sources = getSourcesByGroup(group).filter((source) =>
          matches(source, snapshots[source.id])
        );
        return { group, sources };
      }).filter((entry) => entry.sources.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query, filter, snapshots]
  );

  const totalShown =
    viewMode === 'tier'
      ? filteredTiers.reduce((sum, entry) => sum + entry.sources.length, 0)
      : filteredGroups.reduce((sum, entry) => sum + entry.sources.length, 0);

  const overallTone =
    overallStatus === 'live'
      ? 'from-emerald-500/15 via-emerald-500/5'
      : overallStatus === 'degraded'
        ? 'from-amber-500/15 via-amber-500/5'
        : overallStatus === 'offline'
          ? 'from-rose-500/15 via-rose-500/5'
          : 'from-sky-500/15 via-sky-500/5';

  const inspectSource = inspectId ? FEDERATION_SOURCE_MAP[inspectId] : null;
  const inspectSnapshot = inspectId ? snapshots[inspectId] : null;

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(id);
  }, [copied]);

  const renderSourceRow = (source: FederationSource) => {
    const snapshot = snapshots[source.id];
    const state = snapshot?.state ?? 'idle';
    const style = STATE_STYLE[state] || STATE_STYLE.idle;
    const metricChips = (snapshot?.summary.metrics || []).slice(0, 2);
    const isSourcePaused = state === 'paused';
    const tierMeta = FEDERATION_TIERS[source.tier - 1];
    const tierBadge = (t as Record<string, string>)[tierMeta.badgeKey] || tierMeta.badgeKey;

    const tierPillStyle =
      source.tier === 1
        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
        : source.tier === 2
          ? 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400'
          : source.tier === 3
            ? 'border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400'
            : 'border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400';

    return (
      <div
        key={source.id}
        className="px-3.5 py-2.5 flex flex-wrap lg:flex-nowrap items-center gap-x-3 gap-y-2 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
        <div className="min-w-0 flex-1 basis-[220px]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-900 dark:text-white">
              {source.feature}
            </span>
            <span
              className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border font-semibold ${tierPillStyle}`}
            >
              T{source.tier} · {tierBadge}
            </span>
            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
              {source.origin === 'studio' ? t.syncOriginStudio : t.syncOriginFederation}
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900/5 dark:bg-white/5 text-slate-500 dark:text-slate-400">
              {(t as Record<string, string>)[AUTH_KEY[source.auth]]}
            </span>
          </div>
          <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
            {source.group} · {source.path}
          </div>
        </div>

        <div className="flex items-center gap-3 text-[10px] font-mono tabular-nums text-slate-600 dark:text-slate-300 shrink-0">
          <span className="inline-flex items-center gap-1 min-w-[58px]">
            <Database className="w-2.5 h-2.5 opacity-60" />
            {formatCount(snapshot?.summary.records)}
          </span>
          <span className="inline-flex items-center gap-1 min-w-[58px]">
            <Gauge className="w-2.5 h-2.5 opacity-60" />
            {formatDuration(snapshot?.latencyMs)}
          </span>
          <span className="hidden md:inline-flex items-center gap-1 min-w-[62px]">
            <Clock className="w-2.5 h-2.5 opacity-60" />
            {formatRelativeTime(snapshot?.fetchedAt, now)}
          </span>
          <span className="hidden xl:inline-flex items-center gap-1 min-w-[60px] text-slate-400">
            <RefreshCw className="w-2.5 h-2.5 opacity-60" />
            {Math.round(source.intervalMs / 1000)}s
          </span>
          <span className={`hidden lg:inline-flex ${style.text}`}>
            <Sparkline values={snapshot?.latencyHistory || []} />
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold whitespace-nowrap ${style.chip}`}
            title={snapshot?.error || undefined}
          >
            {state === 'syncing' && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
            {stateLabel(state)}
          </span>
          {metricChips.map((metric) => (
            <span
              key={metric.label}
              className="hidden 2xl:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-900/5 dark:bg-white/5 text-[10px] font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap"
              title={metric.label}
            >
              {metric.label}: {String(metric.value)}
              {metric.unit ? metric.unit : ''}
            </span>
          ))}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void refreshSource(source.id)}
              title={t.syncActionRefresh}
              aria-label={t.syncActionRefresh}
              className="p-1.5 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${state === 'syncing' ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setInspectId(source.id)}
              title={t.syncActionInspect}
              aria-label={t.syncActionInspect}
              className="p-1.5 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <Info className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => toggleSourcePause(source.id)}
              title={isSourcePaused ? t.syncActionResume : t.syncActionPause}
              aria-label={isSourcePaused ? t.syncActionResume : t.syncActionPause}
              className="p-1.5 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              {isSourcePaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto w-full">
      <div className="mx-auto w-full max-w-[1500px] p-3 sm:p-5 space-y-4">
        {/* ---------------------------------------------------------- hero */}
        <div
          className={`relative overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-gradient-to-br ${overallTone} to-transparent`}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.12]"
            style={{
              backgroundImage:
                'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
          <div className="relative p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-11 h-11 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shrink-0 shadow-lg">
                <Radio className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {t.syncCenterTitle}
                  </h1>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide ${
                      STATE_STYLE[
                        overallStatus === 'idle'
                          ? 'idle'
                          : overallStatus === 'live'
                            ? 'ok'
                            : overallStatus === 'offline'
                              ? 'offline'
                              : overallStatus === 'degraded'
                                ? 'error'
                                : 'syncing'
                      ].chip
                    }`}
                  >
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-current opacity-60 animate-ping" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
                    </span>
                    {overallStatus === 'live'
                      ? t.syncLive
                      : overallStatus === 'syncing'
                        ? t.syncSyncing
                        : overallStatus === 'degraded'
                          ? t.syncDegraded
                          : overallStatus === 'offline'
                            ? t.syncOffline
                            : t.syncIdle}
                  </span>
                  {isPaused && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-slate-300 dark:border-slate-700 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                      <Pause className="w-2.5 h-2.5" />
                      {t.syncPausedTag}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                  {t.syncCenterSubtitle}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                  <a
                    href={`https://github.com/${FEDERATION_REPO}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-300/70 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 transition-colors"
                  >
                    {FEDERATION_REPO}
                    <ArrowUpRight className="w-2.5 h-2.5" />
                  </a>
                  <a
                    href={`https://github.com/${FEDERATION_STUDIO_REPO}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-300/70 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 transition-colors"
                  >
                    {FEDERATION_STUDIO_REPO}
                    <ArrowUpRight className="w-2.5 h-2.5" />
                  </a>
                  <span className="px-2 py-0.5 rounded-md bg-slate-900/5 dark:bg-white/5 text-slate-600 dark:text-slate-300">
                    {pulse.total} {t.syncEndpoints}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-900/5 dark:bg-white/5 text-slate-600 dark:text-slate-300">
                    {t.syncLastSync}: {formatRelativeTime(pulse.lastSyncAt, now)}
                  </span>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <div className="inline-flex items-center rounded-xl border border-slate-300/70 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 p-0.5 text-[11px]">
                <span className="px-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {t.syncCadence}
                </span>
                {[
                  { value: 2, label: '0.5×' },
                  { value: 1, label: '1×' },
                  { value: 0.5, label: '2×' },
                ].map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => setIntervalMultiplier(option.value)}
                    className={`px-2 py-1 rounded-lg font-mono font-semibold transition-colors cursor-pointer ${
                      Math.abs(intervalMultiplier - option.value) < 0.01
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setPaused(!isPaused)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-300/70 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:border-[var(--theme-accent)] transition-colors cursor-pointer"
              >
                {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                <span>{isPaused ? t.syncResumeAll : t.syncPauseAll}</span>
              </button>

              <button
                type="button"
                onClick={() => void refreshAll()}
                disabled={isRefreshingAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl theme-btn-primary text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshingAll ? 'animate-spin' : ''}`} />
                <span>{t.syncRefreshAll}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  downloadJson(
                    `supremeai-federation-sync-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
                    exportBundle()
                  )
                }
                title={t.syncExport}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-300/70 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:border-[var(--theme-accent)] transition-colors cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span className="hidden sm:inline">{t.syncExport}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------------- notices */}
        {pulse.degraded > 0 && pulse.online <= pulse.degraded && (
          <div className="rounded-xl border border-amber-300/70 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-500/10 p-3 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1 text-[11px] leading-relaxed text-amber-800 dark:text-amber-200">
              <p className="font-semibold">{t.syncNoticeOfflineTitle}</p>
              <p className="text-amber-700/90 dark:text-amber-200/80">{t.syncNoticeOffline}</p>
            </div>
            <button
              type="button"
              onClick={() => void refreshAll()}
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-400/60 dark:border-amber-500/40 text-[11px] font-semibold text-amber-800 dark:text-amber-200 hover:bg-amber-100/70 dark:hover:bg-amber-500/20 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              {t.syncRetryNow}
            </button>
          </div>
        )}

        {pulse.restricted > 0 && (
          <div className="rounded-xl border border-indigo-300/60 dark:border-indigo-500/30 bg-indigo-50/70 dark:bg-indigo-500/10 p-3 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-indigo-800 dark:text-indigo-200">
              <strong className="font-semibold">{pulse.restricted}</strong> {t.syncNoticeRestricted}
            </p>
          </div>
        )}

        {/* ---------------------------------------------------------- KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
          <KpiCard
            icon={<Radio className="w-3.5 h-3.5" />}
            label={t.syncKpiSources}
            value={`${pulse.online}/${pulse.total}`}
            hint={`${pulse.stale} ${t.syncStale.toLowerCase()} · ${pulse.pending} ${t.syncStateSyncing.toLowerCase()}`}
            tone="text-emerald-500"
          />
          <KpiCard
            icon={<Database className="w-3.5 h-3.5" />}
            label={t.syncKpiRecords}
            value={formatCount(pulse.totalRecords)}
            hint={t.syncKpiRecordsHint}
            tone="text-sky-500"
          />
          <KpiCard
            icon={<Gauge className="w-3.5 h-3.5" />}
            label={t.syncKpiLatency}
            value={pulse.averageLatencyMs === null ? '—' : `${pulse.averageLatencyMs} ms`}
            hint={t.syncKpiLatencyHint}
            tone="text-violet-500"
          />
          <KpiCard
            icon={<CheckCircle2 className="w-3.5 h-3.5" />}
            label={t.syncKpiSuccess}
            value={pulse.successRate === null ? '—' : `${pulse.successRate}%`}
            hint={`${pulse.degraded} ${t.syncDegraded.toLowerCase()}`}
            tone="text-emerald-500"
          />
          <KpiCard
            icon={<HardDrive className="w-3.5 h-3.5" />}
            label={t.syncKpiPayload}
            value={formatBytes(pulse.totalBytes)}
            hint={t.syncKpiPayloadHint}
            tone="text-amber-500"
          />
          <KpiCard
            icon={<Clock className="w-3.5 h-3.5" />}
            label={t.syncKpiLastSync}
            value={formatRelativeTime(pulse.lastSyncAt, now)}
            hint={`${t.syncInterval}: ${intervalMultiplier}×`}
            tone="text-cyan-500"
          />
        </div>

        {/* ---------------------------------------------------------- toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
            <div className="relative flex-1 min-w-0 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t.syncSearchPlaceholder}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent-ring)]"
              />
            </div>
            <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 p-0.5 text-[11px]">
              {(
                [
                  { id: 'all', label: t.syncFilterAll },
                  { id: 'live', label: t.syncFilterLive },
                  { id: 'attention', label: t.syncFilterAttention },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setFilter(option.id)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    filter === option.id
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setViewMode('tier')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  viewMode === 'tier'
                    ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Zap className="w-3 h-3" />
                <span>{t.syncViewByTier}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('subsystem')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  viewMode === 'subsystem'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Radio className="w-3 h-3" />
                <span>{t.syncViewBySubsystem}</span>
              </button>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{t.syncCoverageSubtitle}</p>
        </div>

        {/* ---------------------------------------------------------- matrix */}
        {totalShown === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center space-y-2">
            <Search className="w-6 h-6 text-slate-400 mx-auto" />
            <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
              {t.syncNoMatches}
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setFilter('all');
              }}
              className="text-[11px] font-semibold theme-accent-text hover:underline cursor-pointer"
            >
              {t.syncClearFilters}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {viewMode === 'tier'
              ? filteredTiers.map(({ tierMeta, sources }) => {
                  const accent = ACCENT[tierMeta.accent] || ACCENT.slate;
                  const tierSnapshots = sources
                    .map((source) => snapshots[source.id])
                    .filter(Boolean) as FederationSnapshot[];
                  const tierOnline = tierSnapshots.filter(
                    (snapshot) => snapshot.state === 'ok'
                  ).length;

                  return (
                    <section
                      key={tierMeta.id}
                      className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 overflow-hidden shadow-xs"
                    >
                      <header className="px-3.5 py-2.5 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap sm:flex-nowrap items-center gap-2.5 bg-slate-50/70 dark:bg-slate-900/60">
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ring-1 ${accent.bg} ${accent.ring} ${accent.text}`}
                        >
                          {tierMeta.tier === 1 ? (
                            <Zap className="w-3.5 h-3.5" />
                          ) : tierMeta.tier === 2 ? (
                            <Gauge className="w-3.5 h-3.5" />
                          ) : tierMeta.tier === 3 ? (
                            <Bot className="w-3.5 h-3.5" />
                          ) : (
                            <Server className="w-3.5 h-3.5" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-xs font-bold text-slate-900 dark:text-white">
                              {(t as Record<string, string>)[tierMeta.labelKey]}
                            </h2>
                            <span
                              className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-semibold ${accent.bg} ${accent.text}`}
                            >
                              {(t as Record<string, string>)[tierMeta.slaKey]}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {(t as Record<string, string>)[tierMeta.descKey]}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-mono tabular-nums px-2 py-0.5 rounded-full border ${accent.bg} ${accent.ring} ${accent.text} font-bold`}
                        >
                          {tierOnline}/{sources.length} live
                        </span>
                      </header>

                      <div className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
                        {sources.map(renderSourceRow)}
                      </div>
                    </section>
                  );
                })
              : filteredGroups.map(({ group, sources }) => {
                  const meta = SOURCE_GROUP_META[group];
                  const accent = ACCENT[meta.accent] || ACCENT.slate;
                  const groupSnapshots = sources
                    .map((source) => snapshots[source.id])
                    .filter(Boolean) as FederationSnapshot[];
                  const groupOnline = groupSnapshots.filter(
                    (snapshot) => snapshot.state === 'ok'
                  ).length;

                  return (
                    <section
                      key={group}
                      className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 overflow-hidden"
                    >
                      <header className="px-3.5 py-2.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center gap-2.5 bg-slate-50/70 dark:bg-slate-900/60">
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ring-1 ${accent.bg} ${accent.ring} ${accent.text}`}
                        >
                          {group === 'pulse' ? (
                            <Zap className="w-3.5 h-3.5" />
                          ) : group === 'gateway' ? (
                            <Sparkles className="w-3.5 h-3.5" />
                          ) : group === 'agents' ? (
                            <Activity className="w-3.5 h-3.5" />
                          ) : group === 'memory' ? (
                            <Database className="w-3.5 h-3.5" />
                          ) : (
                            <Radio className="w-3.5 h-3.5" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h2 className="text-xs font-bold text-slate-900 dark:text-white">
                            {meta.label}
                          </h2>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {meta.description}
                          </p>
                        </div>
                        <span className={`text-[10px] font-mono tabular-nums ${accent.text}`}>
                          {groupOnline}/{sources.length} live
                        </span>
                      </header>

                      <div className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
                        {sources.map(renderSourceRow)}
                      </div>
                    </section>
                  );
                })}
          </div>
        )}

        {/* ---------------------------------------------------------- activity + diagnostics */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
          <section className="xl:col-span-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 overflow-hidden">
            <header className="px-3.5 py-2.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-emerald-500" />
                <h2 className="text-xs font-bold text-slate-900 dark:text-white">
                  {t.syncActivity}
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                {events.length} {t.syncEventsUnit}
              </span>
            </header>
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-200/60 dark:divide-slate-800/60">
              {events.length === 0 ? (
                <div className="p-6 text-center text-[11px] text-slate-500 dark:text-slate-400">
                  {t.syncActivityEmpty}
                </div>
              ) : (
                events.slice(0, 24).map((event) => {
                  const source = FEDERATION_SOURCE_MAP[event.sourceId];
                  const style = STATE_STYLE[event.state] || STATE_STYLE.idle;
                  return (
                    <div
                      key={event.id}
                      className="px-3.5 py-1.5 flex items-center gap-2.5 text-[11px] hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
                      <span className="font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[140px]">
                        {source?.feature || event.sourceId}
                      </span>
                      <span className={`${style.text} font-medium shrink-0`}>
                        {stateLabel(event.state)}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 truncate flex-1 min-w-0">
                        {event.message || '—'}
                      </span>
                      {event.latencyMs !== null && (
                        <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                          {event.latencyMs}ms
                        </span>
                      )}
                      <span className="font-mono tabular-nums text-slate-400 dark:text-slate-500 shrink-0">
                        {formatRelativeTime(event.at, now)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 p-3.5 space-y-2.5">
            <div className="flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-sky-500" />
              <h2 className="text-xs font-bold text-slate-900 dark:text-white">
                {t.syncDiagnostics}
              </h2>
            </div>
            <dl className="text-[11px] space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-500 dark:text-slate-400">{t.syncLastSync}</dt>
                <dd className="font-mono tabular-nums text-slate-800 dark:text-slate-200">
                  {formatRelativeTime(pulse.lastSyncAt, now)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-500 dark:text-slate-400">{t.syncInterval}</dt>
                <dd className="font-mono tabular-nums text-slate-800 dark:text-slate-200">
                  {intervalMultiplier}×
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-500 dark:text-slate-400">{t.syncOnline}</dt>
                <dd className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                  {pulse.online}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-500 dark:text-slate-400">{t.syncDegraded}</dt>
                <dd className="font-mono tabular-nums text-rose-600 dark:text-rose-400">
                  {pulse.degraded}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-500 dark:text-slate-400">{t.syncKpiPayload}</dt>
                <dd className="font-mono tabular-nums text-slate-800 dark:text-slate-200">
                  {formatBytes(pulse.totalBytes)}
                </dd>
              </div>
            </dl>
            <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400 border-t border-slate-200/70 dark:border-slate-800 pt-2">
              {t.syncContractNote}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  void navigator?.clipboard?.writeText?.(JSON.stringify(exportBundle(), null, 2));
                  setCopied(true);
                }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-medium text-slate-700 dark:text-slate-200 hover:border-[var(--theme-accent)] cursor-pointer"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                {copied ? t.syncCopied : t.syncCopyJson}
              </button>
              <button
                type="button"
                onClick={clearCache}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-medium text-slate-700 dark:text-slate-200 hover:border-rose-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                {t.syncResetCache}
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* ---------------------------------------------------------- inspector */}
      {inspectSource && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setInspectId(null)}
          />
          <div className="relative w-full sm:max-w-4xl max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
            <header className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {inspectSource.feature}
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold ${
                      STATE_STYLE[inspectSnapshot?.state || 'idle'].chip
                    }`}
                  >
                    {stateLabel(inspectSnapshot?.state || 'idle')}
                  </span>
                  {inspectSnapshot?.httpStatus && (
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      HTTP {inspectSnapshot.httpStatus}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {inspectSource.description}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  <span className="px-1.5 py-0.5 rounded bg-slate-900/5 dark:bg-white/5">
                    {inspectSource.path}
                  </span>
                  <span>{inspectSource.backendModule}</span>
                  <span>
                    {t.syncCadence}: {Math.round(inspectSource.intervalMs / 1000)}s
                  </span>
                  <span>
                    {t.syncRecords}: {formatCount(inspectSnapshot?.summary.records)} ·{' '}
                    {formatBytes(inspectSnapshot?.summary.bytes || 0)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectId(null)}
                aria-label={t.syncClose}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {inspectSource.metrics?.map((metric) => {
                  const resolved = inspectSnapshot?.summary.metrics.find(
                    (item) => item.label === metric.label
                  );
                  return (
                    <div
                      key={metric.path}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40"
                    >
                      <div className="text-[9px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {metric.label}
                      </div>
                      <div className="text-xs font-mono font-semibold text-slate-900 dark:text-white">
                        {resolved ? String(resolved.value) : '—'}
                        {metric.unit || ''}
                      </div>
                    </div>
                  );
                })}
                {(inspectSnapshot?.summary.topKeys || []).map((key) => (
                  <span
                    key={key}
                    className="px-2 py-1 rounded-md bg-slate-900/5 dark:bg-white/5 text-[10px] font-mono text-slate-600 dark:text-slate-300"
                  >
                    {key}
                  </span>
                ))}
              </div>

              {inspectSnapshot?.error && (
                <div className="rounded-lg border border-amber-300/70 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-500/10 p-2.5 text-[11px] text-amber-800 dark:text-amber-200">
                  <strong className="font-semibold">{t.syncStateError}:</strong>{' '}
                  {inspectSnapshot.error}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t.syncPayloadPreview}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                    {inspectSnapshot?.fetchedAt
                      ? `${t.syncLastSync} ${formatRelativeTime(inspectSnapshot.fetchedAt, now)}`
                      : t.syncNever}
                  </span>
                </div>
                <pre className="max-h-[46vh] overflow-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-100 text-[10.5px] leading-relaxed p-3 font-mono">
                  {inspectSnapshot?.data
                    ? safeJson(inspectSnapshot.data)
                    : `// ${t.syncNoPayloadYet}`}
                </pre>
              </div>
            </div>

            <footer className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => void refreshSource(inspectSource.id)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:border-[var(--theme-accent)] cursor-pointer"
              >
                <RefreshCw
                  className={`w-3 h-3 ${inspectSnapshot?.state === 'syncing' ? 'animate-spin' : ''}`}
                />
                {t.syncActionRefresh}
              </button>
              <button
                type="button"
                onClick={() => {
                  void copyToClipboard(safeJson(inspectSnapshot?.data ?? null));
                  setCopied(true);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:border-[var(--theme-accent)] cursor-pointer"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                {copied ? t.syncCopied : t.syncCopyJson}
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadJson(
                    `${inspectSource.id}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
                    {
                      source: inspectSource,
                      snapshot: inspectSnapshot,
                    }
                  )
                }
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:border-[var(--theme-accent)] cursor-pointer"
              >
                <Download className="w-3 h-3" />
                {t.syncDownload}
              </button>
              <button
                type="button"
                onClick={() => setInspectId(null)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg theme-btn-primary text-[11px] font-semibold cursor-pointer"
              >
                {t.syncClose}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};
