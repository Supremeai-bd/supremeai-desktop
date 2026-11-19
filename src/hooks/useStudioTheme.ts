import { useCallback, useEffect, useState } from 'react';
import { getLiveTheme, LIVE_THEMES } from '../data/studioData';
import type { LiveThemeId, ResolvedColorScheme, ThemeConfig, ThemeMode } from '../types/studio';

const THEME_STORAGE_KEY = 'supremeai.desktop.theme_config.v2';

function readOsPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function loadThemeConfig(): ThemeConfig {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ThemeConfig>;
      const validMode: ThemeMode =
        parsed.mode === 'light' || parsed.mode === 'dark' || parsed.mode === 'system'
          ? parsed.mode
          : 'dark';
      const validTheme = LIVE_THEMES.some((t) => t.id === parsed.liveTheme)
        ? (parsed.liveTheme as LiveThemeId)
        : 'alpine-dunes';
      return {
        mode: validMode,
        liveTheme: validTheme,
        liveMotion: parsed.liveMotion !== false,
      };
    }
    // Migrate legacy v1 theme key if present
    const legacy = localStorage.getItem('supremeai.desktop.theme.v1');
    if (legacy === 'light' || legacy === 'dark') {
      return { mode: legacy, liveTheme: 'alpine-dunes', liveMotion: true };
    }
  } catch {
    // Ignore storage read errors
  }
  return { mode: 'dark', liveTheme: 'alpine-dunes', liveMotion: true };
}

function applyThemeTokens(scheme: ResolvedColorScheme, liveThemeId: LiveThemeId) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', scheme === 'dark');
  root.dataset.theme = scheme;
  root.dataset.liveTheme = liveThemeId;

  const palette = getLiveTheme(liveThemeId);
  const tokens = scheme === 'dark' ? palette.dark : palette.light;

  root.style.setProperty('--theme-accent', tokens.accent);
  root.style.setProperty('--theme-accent-hover', tokens.accentHover);
  root.style.setProperty('--theme-accent-soft', tokens.accentSoft);
  root.style.setProperty('--theme-accent-ring', tokens.accentRing);
  root.style.setProperty('--theme-accent-contrast', tokens.accentContrast);
  root.style.setProperty('--theme-accent-gradient', tokens.accentGradient);
  root.style.setProperty('--theme-surface-glass', tokens.surfaceGlass);
  root.style.setProperty('--theme-surface-strong', tokens.surfaceStrong);
  root.style.setProperty('--theme-surface-sidebar', tokens.surfaceSidebar);
  root.style.setProperty('--theme-surface-input', tokens.surfaceInput);
  root.style.setProperty('--theme-surface-border', tokens.surfaceBorder);
  root.style.setProperty('--theme-backdrop-base', tokens.backdropBase);
  root.style.setProperty('--theme-backdrop-glow', tokens.backdropGlow);
  root.style.setProperty('--theme-text-primary', tokens.textPrimary);
  root.style.setProperty('--theme-text-secondary', tokens.textSecondary);
  root.style.setProperty('--theme-text-muted', tokens.textMuted);
  root.style.setProperty('--theme-user-bg', tokens.userBg);
  root.style.setProperty('--theme-user-border', tokens.userBorder);
}

export function useStudioTheme() {
  const [config, setConfig] = useState<ThemeConfig>(loadThemeConfig);
  const [osDark, setOsDark] = useState<boolean>(readOsPrefersDark);

  const resolvedScheme: ResolvedColorScheme =
    config.mode === 'system' ? (osDark ? 'dark' : 'light') : config.mode;

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setOsDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    applyThemeTokens(resolvedScheme, config.liveTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(config));
    } catch {
      // Ignore storage write errors
    }
  }, [config, resolvedScheme]);

  const setMode = useCallback((mode: ThemeMode) => {
    setConfig((prev) => ({ ...prev, mode }));
  }, []);

  const setLiveTheme = useCallback((liveTheme: LiveThemeId) => {
    setConfig((prev) => ({ ...prev, liveTheme }));
  }, []);

  const setLiveMotion = useCallback((liveMotion: boolean) => {
    setConfig((prev) => ({ ...prev, liveMotion }));
  }, []);

  const toggleLightDark = useCallback(() => {
    setConfig((prev) => {
      const current = prev.mode === 'system' ? (osDark ? 'dark' : 'light') : prev.mode;
      return { ...prev, mode: current === 'dark' ? 'light' : 'dark' };
    });
  }, [osDark]);

  return {
    config,
    resolvedScheme,
    palette: getLiveTheme(config.liveTheme),
    setMode,
    setLiveTheme,
    setLiveMotion,
    toggleLightDark,
  };
}
