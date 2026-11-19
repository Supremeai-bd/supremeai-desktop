/**
 * SupremeAI Environment Configuration & Standardizer
 * Validates and provides typed access to environment variables,
 * with seamless Mock-to-Real API adapter switching.
 */

export interface AppEnvConfig {
  isMockEnabled: boolean;
  apiBaseUrl: string;
  wsBaseUrl: string;
  mockBaseUrl: string;
  supabaseUrl: string;
  gatewayUrl: string;
  mcpTowerUrl: string;
  version: string;
}

const isProdEnvironment = (): boolean => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.PROD !== undefined) {
    return Boolean(import.meta.env.PROD);
  }
  if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
    return process.env.NODE_ENV === 'production';
  }
  return false;
};

const getEnvBool = (key: string, defaultValue: boolean): boolean => {
  const metaEnv = typeof import.meta !== 'undefined' ? import.meta.env : undefined;
  const val = metaEnv?.[key] ?? (typeof process !== 'undefined' ? process.env?.[key] : undefined);
  if (val === undefined || val === null || val === '') return defaultValue;
  return val === 'true' || val === '1';
};

const getEnvString = (key: string, defaultValue: string): string => {
  const metaEnv = typeof import.meta !== 'undefined' ? import.meta.env : undefined;
  return (
    metaEnv?.[key] ??
    (typeof process !== 'undefined' ? process.env?.[key] : undefined) ??
    defaultValue
  );
};

// Check for runtime local override if developer switches mock mode in UI (ONLY in dev mode!)
const getRuntimeMockOverride = (): boolean | null => {
  if (isProdEnvironment()) return false;
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('supremeai_mock_override');
      if (saved !== null) return saved === 'true';
    }
  } catch {}
  return null;
};

export const env: AppEnvConfig = {
  isMockEnabled: isProdEnvironment()
    ? false
    : (getRuntimeMockOverride() ?? getEnvBool('VITE_USE_MOCK', false)),
  // Same-origin by default (routed via Vite/Express in preview and Cloudflare Pages Functions `/api/*` in prod)
  // to avoid cross-domain CORS preflights and ad-blocker false positives. Set VITE_API_BASE_URL to override.
  apiBaseUrl: getEnvString('VITE_API_BASE_URL', ''),
  wsBaseUrl: getEnvString('VITE_WS_BASE_URL', isProdEnvironment() ? '' : 'ws://localhost:3000'),
  mockBaseUrl: getEnvString('VITE_MOCK_BASE_URL', '/api/mock'),
  supabaseUrl: getEnvString('VITE_SUPABASE_URL', ''),
  gatewayUrl: getEnvString('VITE_GATEWAY_URL', '/v1'),
  mcpTowerUrl: getEnvString('VITE_MCP_TOWER_URL', '/api/mcp-tower'),
  version: 'v2.4.0-prod',
};

/**
 * Toggle between local Mock mode and live Backend API proxy mode at runtime.
 */
export const setRuntimeMockMode = (enabled: boolean): void => {
  localStorage.setItem('supremeai_mock_override', String(enabled));
  env.isMockEnabled = enabled;
  window.dispatchEvent(new CustomEvent('supremeai-mock-mode-changed', { detail: { enabled } }));
};
