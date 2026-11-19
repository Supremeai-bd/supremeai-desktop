import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MCP_TOWER_ORIGIN,
  DEFAULT_WEB_STUDIO_URL,
  GITHUB_MONOREPO_SLUG,
  GITHUB_PUBLIC_REPO_SLUG,
  resolveMcpRpcCandidates,
} from './platformEndpoints';
import { buildCounterpartShortcuts, DEFAULT_RELEASE_MANIFEST } from './releaseDownloads';

describe('platformEndpoints SSOT & MCP Tower candidates', () => {
  it('points to live MCP Tower and authoritative GitHub repositories', () => {
    expect(DEFAULT_MCP_TOWER_ORIGIN).toBe('https://supremeai-mcp-tower-live.onrender.com');
    expect(GITHUB_MONOREPO_SLUG).toBe('Supremeai-bd/supremeai');
    expect(GITHUB_PUBLIC_REPO_SLUG).toBe('Supremeai-bd/supremeai-public');
  });

  it('resolves both /agents/federated_bridge_agent/mcp and /mcp JSON-RPC candidates', () => {
    expect(resolveMcpRpcCandidates('https://supremeai-mcp-tower-live.onrender.com/mcp')).toEqual([
      'https://supremeai-mcp-tower-live.onrender.com/agents/federated_bridge_agent/mcp',
      'https://supremeai-mcp-tower-live.onrender.com/mcp',
    ]);

    expect(
      resolveMcpRpcCandidates(
        'https://supremeai-mcp-tower-live.onrender.com/agents/federated_bridge_agent/mcp'
      )
    ).toEqual([
      'https://supremeai-mcp-tower-live.onrender.com/agents/federated_bridge_agent/mcp',
      'https://supremeai-mcp-tower-live.onrender.com/mcp',
    ]);
  });
});

describe('cross-platform download & counterpart shortcuts', () => {
  it('returns APK and EXE download shortcuts when running on Web', () => {
    const shortcuts = buildCounterpartShortcuts('web', DEFAULT_RELEASE_MANIFEST);
    expect(shortcuts.map((s) => s.id)).toEqual(['android-apk', 'windows-exe']);
    expect(shortcuts[0].url).toMatch(/\.apk$/);
    expect(shortcuts[1].url).toMatch(/\.exe$/);
    expect(shortcuts.every((s) => s.isDirectDownload)).toBe(true);
  });

  it('returns Web URL and Windows EXE shortcuts when running inside Android APK', () => {
    const shortcuts = buildCounterpartShortcuts('android', DEFAULT_RELEASE_MANIFEST);
    expect(shortcuts.map((s) => s.id)).toEqual(['web', 'windows-exe']);
    expect(shortcuts[0].url).toBe(DEFAULT_WEB_STUDIO_URL);
    expect(shortcuts[0].isDirectDownload).toBe(false);
    expect(shortcuts[1].url).toMatch(/\.exe$/);
    expect(shortcuts[1].isDirectDownload).toBe(true);
  });

  it('returns Web URL and Android APK shortcuts when running inside Desktop EXE', () => {
    const shortcuts = buildCounterpartShortcuts('desktop', DEFAULT_RELEASE_MANIFEST);
    expect(shortcuts.map((s) => s.id)).toEqual(['web', 'android-apk']);
    expect(shortcuts[0].url).toBe(DEFAULT_WEB_STUDIO_URL);
    expect(shortcuts[0].isDirectDownload).toBe(false);
    expect(shortcuts[1].url).toMatch(/\.apk$/);
    expect(shortcuts[1].isDirectDownload).toBe(true);
  });
});
