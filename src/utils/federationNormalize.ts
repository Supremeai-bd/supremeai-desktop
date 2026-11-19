/**
 * Tolerant payload normalisers for live federation data.
 *
 * Backend routes in `Supremeai-bd/supremeai` return a mix of bare arrays, bare
 * objects and envelope objects (`{status, data}`, `{items, total}`, ...). The
 * Studio fabric never assumes a single shape: it extracts a best-effort record
 * count, surfaces the top-level keys and exposes KPI metrics through dot-paths.
 */

export type PayloadKind = 'array' | 'object' | 'empty' | 'text' | 'unknown';

export interface PayloadMetric {
  label: string;
  value: string | number | boolean;
  unit?: string;
}

export interface PayloadSummary {
  kind: PayloadKind;
  /** Best-effort number of domain records in the payload. */
  records: number | null;
  /** Top-level keys (capped) for the inspector preview. */
  topKeys: string[];
  /** Metrics resolved from the source's metric specs. */
  metrics: PayloadMetric[];
  /** Approximate serialised size in bytes. */
  bytes: number;
  /** Total top-level key count (may exceed `topKeys.length`). */
  keyCount: number;
}

const MAX_TOP_KEYS = 8;

/** Read a nested value using a dot-path. Supports numeric array indexes. */
export function readPath(payload: unknown, path: string): unknown {
  if (!path) return payload;
  const segments = path.split('.');
  let cursor: unknown = payload;
  for (const segment of segments) {
    if (cursor === null || cursor === undefined) return undefined;
    if (Array.isArray(cursor)) {
      const index = Number(segment);
      if (!Number.isInteger(index)) return undefined;
      cursor = cursor[index];
      continue;
    }
    if (typeof cursor !== 'object') return undefined;
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
}

/** Coerce an unknown value into a display-safe primitive, or `null` if opaque. */
export function toDisplayValue(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value.length > 64 ? `${value.slice(0, 61)}…` : value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? '' : 's'}`;
  if (typeof value === 'object') return `${Object.keys(value as object).length} field(s)`;
  return null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Count domain records. Explicit collection keys win; otherwise we fall back to
 * heuristics for the common envelope patterns returned by the FastAPI routes.
 */
export function countRecords(payload: unknown, collectionKeys: string[] = []): number | null {
  if (Array.isArray(payload)) return payload.length;
  if (!isPlainObject(payload)) return null;

  for (const key of collectionKeys) {
    const candidate = readPath(payload, key);
    if (Array.isArray(candidate)) return candidate.length;
    if (isPlainObject(candidate)) return Object.keys(candidate).length;
  }

  // Generic envelope fallbacks.
  const genericKeys = ['data', 'items', 'results', 'records', 'rows', 'list', 'entries'];
  for (const key of genericKeys) {
    const candidate = payload[key];
    if (Array.isArray(candidate)) return candidate.length;
  }

  // Counts reported by the backend itself.
  for (const key of ['total', 'total_count', 'count', 'total_items']) {
    const value = payload[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }

  return null;
}

/** Approximate serialised byte size, resilient to cycles / huge graphs. */
export function approximateBytes(payload: unknown, cap = 5_000_000): number {
  if (payload === undefined) return 0;
  try {
    const serialised = JSON.stringify(payload);
    if (typeof serialised !== 'string') return 0;
    return Math.min(serialised.length, cap);
  } catch {
    return 0;
  }
}

export function summarizePayload(
  payload: unknown,
  options: {
    collectionKeys?: string[];
    metrics?: Array<{ path: string; label: string; unit?: string }>;
  } = {}
): PayloadSummary {
  const { collectionKeys = [], metrics = [] } = options;
  const kind: PayloadKind = Array.isArray(payload)
    ? payload.length === 0
      ? 'empty'
      : 'array'
    : typeof payload === 'string'
      ? 'text'
      : isPlainObject(payload)
        ? Object.keys(payload).length === 0
          ? 'empty'
          : 'object'
        : 'unknown';

  const keys = isPlainObject(payload) ? Object.keys(payload) : [];

  const resolved: PayloadMetric[] = [];
  for (const spec of metrics) {
    const raw = readPath(payload, spec.path);
    const value = toDisplayValue(raw);
    if (value === null) continue;
    resolved.push({ label: spec.label, value, unit: spec.unit });
  }

  return {
    kind,
    records: countRecords(payload, collectionKeys),
    topKeys: keys.slice(0, MAX_TOP_KEYS),
    keyCount: keys.length,
    metrics: resolved,
    bytes: approximateBytes(payload),
  };
}

/** Compact human formatting used across the sync UI. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 10_000) return `${(value / 1000).toFixed(1)}k`;
  return value.toLocaleString('en-US');
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${(ms / 60_000).toFixed(1)} min`;
}

export function formatRelativeTime(timestamp: number | null | undefined, now = Date.now()): string {
  if (!timestamp) return 'never';
  const delta = Math.max(0, now - timestamp);
  if (delta < 1500) return 'just now';
  if (delta < 60_000) return `${Math.round(delta / 1000)}s ago`;
  if (delta < 3_600_000) return `${Math.round(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.round(delta / 3_600_000)}h ago`;
  return `${Math.round(delta / 86_400_000)}d ago`;
}
