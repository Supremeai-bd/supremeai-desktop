import { useEffect, useRef, useState } from 'react';
import { Check, Monitor, Moon, Palette, Sun } from 'lucide-react';
import { LIVE_THEMES } from '../data/studioData';
import type { LiveThemeId, ResolvedColorScheme, ThemeConfig, ThemeMode } from '../types/studio';
import { useI18n } from '../i18n';

interface ThemeControlPopoverProps {
  config: ThemeConfig;
  resolvedScheme: ResolvedColorScheme;
  onModeChange: (mode: ThemeMode) => void;
  onLiveThemeChange: (id: LiveThemeId) => void;
  onOpenSettings?: () => void;
}

export function ThemeControlPopover({
  config,
  resolvedScheme,
  onModeChange,
  onLiveThemeChange,
  onOpenSettings,
}: ThemeControlPopoverProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const TriggerIcon =
    config.mode === 'system' ? Monitor : resolvedScheme === 'dark' ? Moon : Sun;

  const modes: Array<{ id: ThemeMode; label: string; icon: typeof Sun }> = [
    { id: 'system', label: t.themeSystemOption, icon: Monitor },
    { id: 'light', label: t.themeLightOption, icon: Sun },
    { id: 'dark', label: t.themeDarkOption, icon: Moon },
  ];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={t.appearanceSection}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200/80 dark:border-slate-700/70 bg-white/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer whitespace-nowrap shrink-0"
      >
        <TriggerIcon className="w-3.5 h-3.5 theme-accent-text" />
        <span>{t.themeShort}</span>
      </button>

      {open && (
        <div className="absolute left-0 bottom-full mb-2 w-72 rounded-2xl border theme-surface-strong p-3 z-50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
              <Palette className="w-3.5 h-3.5 theme-accent-text" />
              {t.appearanceSection}
            </span>
            {onOpenSettings && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onOpenSettings();
                }}
                className="text-[11px] font-medium theme-accent-text hover:underline cursor-pointer"
              >
                {t.settings}
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100/80 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800">
            {modes.map((m) => {
              const Icon = m.icon;
              const active = config.mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onModeChange(m.id)}
                  className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          <div className="space-y-1 max-h-52 overflow-y-auto studio-scroll pr-0.5">
            {LIVE_THEMES.map((theme) => {
              const active = config.liveTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => onLiveThemeChange(theme.id)}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer border ${
                    active
                      ? 'theme-accent-active'
                      : 'border-transparent hover:bg-slate-100/80 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex items-center -space-x-1 shrink-0">
                      {theme.swatches.map((hex, i) => (
                        <span
                          key={i}
                          className="w-3.5 h-3.5 rounded-full border border-white/70 dark:border-slate-900"
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">{theme.name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {theme.tagline}
                      </div>
                    </div>
                  </div>
                  {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
