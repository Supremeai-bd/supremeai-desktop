import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  normalizeComputeBrowserPayload,
  normalizeMemoryGraphPayload,
  useControlCenterStore,
} from './useControlCenterStore';

describe('useControlCenterStore defensive payload normalization', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useControlCenterStore.setState({
      kaggleRuns: [],
      devToolsAudits: [],
      crawlerJobs: [],
      memoryEntries: [],
      qdrantCollections: [],
      astMatches: [],
      computeError: null,
      computeNotice: null,
      memoryError: null,
      memoryNotice: null,
    });
  });

  it('prevents undefined arrays when compute-browser returns stub payload { data: {}, status: "ok" }', () => {
    const res = normalizeComputeBrowserPayload({ data: {}, status: 'ok' });
    expect(Array.isArray(res.kaggleRuns)).toBe(true);
    expect(Array.isArray(res.devToolsAudits)).toBe(true);
    expect(Array.isArray(res.crawlerJobs)).toBe(true);
    expect(res.kaggleRuns.length).toBeGreaterThan(0);
    expect(res.devToolsAudits.length).toBeGreaterThan(0);
    expect(res.crawlerJobs.length).toBeGreaterThan(0);
    expect(res.notice).toContain('partial compute telemetry');
  });

  it('prevents undefined arrays when memory returns stub payload { memory: [], status: "ok" }', () => {
    const res = normalizeMemoryGraphPayload({ memory: [], status: 'ok' });
    expect(Array.isArray(res.entries)).toBe(true);
    expect(Array.isArray(res.collections)).toBe(true);
    expect(Array.isArray(res.astMatches)).toBe(true);
    expect(res.entries.length).toBeGreaterThan(0);
    expect(res.collections.length).toBeGreaterThan(0);
    expect(res.astMatches.length).toBeGreaterThan(0);
    expect(res.provenance).toBe('local-snapshot');
    expect(res.notice).toContain('partial memory payload');
  });

  it('preserves full controlPlaneRouter responses with zero fallback notices', () => {
    const compute = normalizeComputeBrowserPayload({
      kaggleRuns: [
        {
          id: 'k1',
          title: 'eval-v1',
          accelerator: 'T4x2',
          status: 'completed',
          durationSec: 120,
          submittedBy: 'admin@supremeai.bd',
          submittedAt: '1m ago',
        },
      ],
      devToolsAudits: [
        {
          id: 'cdp1',
          url: 'https://supremeai-api-ulw0.onrender.com/healthz',
          lcpMs: 180,
          cls: 0.01,
          fcpMs: 90,
          consoleErrors: 0,
          networkFailures: 0,
          verdict: 'healthy',
          auditedAt: 'Just now',
          provenance: 'live-mcp',
        },
      ],
      crawlerJobs: [],
    });

    expect(compute.notice).toBeNull();
    expect(compute.kaggleRuns).toHaveLength(1);
    expect(compute.devToolsAudits[0].provenance).toBe('live-mcp');
    expect(compute.crawlerJobs).toEqual([]);
  });

  it('catches fetch failures cleanly in loadComputeAndBrowser and loadMemoryAndGraph without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Gateway 502 Bad Gateway')));
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    });

    await expect(useControlCenterStore.getState().loadComputeAndBrowser()).resolves.toBeUndefined();
    await expect(useControlCenterStore.getState().loadMemoryAndGraph()).resolves.toBeUndefined();

    const state = useControlCenterStore.getState();
    expect(state.computeError).toContain('Gateway 502 Bad Gateway');
    expect(state.memoryError).toContain('Gateway 502 Bad Gateway');
    expect(Array.isArray(state.kaggleRuns)).toBe(true);
    expect(Array.isArray(state.memoryEntries)).toBe(true);
    expect(state.isLoadingCompute).toBe(false);
    expect(state.isLoadingMemory).toBe(false);
  });
});
