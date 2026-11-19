import { afterEach, describe, expect, it, vi } from 'vitest';

const { invokeMock, isTauriMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  isTauriMock: vi.fn(() => false),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: any[]) => invokeMock(...args),
  isTauri: () => isTauriMock(),
}));

import {
  applyReadyUpdate,
  checkAndStageBackgroundUpdate,
  getUpdateState,
} from './appAutoUpdater';

describe('appAutoUpdater background staging & silent update coordinator', () => {
  afterEach(() => {
    invokeMock.mockReset();
    isTauriMock.mockReturnValue(false);
    vi.restoreAllMocks();
  });

  it('stays up-to-date when remote release matches current version', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          version: '2.5.0',
          tag: 'latest',
          repo: 'Supremeai-bd/supremeai-public',
          publishedAt: '2026-11-19T00:00:00Z',
          releasePageUrl: 'https://github.com/Supremeai-bd/supremeai-public/releases/tag/latest',
          webUrl: 'https://supremeai-studio.pages.dev',
          windowsExeUrl:
            'https://github.com/Supremeai-bd/supremeai-public/releases/download/latest/SupremeAI.Desktop_2.5.0_x64-setup.exe',
          androidApkUrl:
            'https://github.com/Supremeai-bd/supremeai-public/releases/download/latest/SupremeAI-Studio-app-universal-release.apk',
          vscodeVsixUrl:
            'https://github.com/Supremeai-bd/supremeai-public/releases/download/latest/supremeai-vscode-2.5.0.vsix',
          provenance: 'manifest',
          assets: [],
        }),
        { status: 200 }
      )
    );

    const state = await checkAndStageBackgroundUpdate(true);
    expect(state.status).toBe('up-to-date');
    expect(state.latestVersion).toBe('2.5.0');
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('stages Windows NSIS installer quietly in background when Tauri desktop sees a newer version', async () => {
    isTauriMock.mockReturnValue(true);
    invokeMock.mockImplementation(async (command: string) => {
      if (command === 'get_app_runtime_info') {
        return { version: '2.5.0', os: 'windows', arch: 'x86_64', isWindows: true, isAndroid: false };
      }
      if (command === 'stage_silent_update') {
        return {
          filePath: 'C:\\Users\\Test\\AppData\\Local\\com.supremeai.desktop\\updates\\SupremeAI.Desktop_2.6.0_x64-setup.exe',
          fileName: 'SupremeAI.Desktop_2.6.0_x64-setup.exe',
          sizeBytes: 42_000_000,
          alreadyCached: false,
        };
      }
      if (command === 'apply_staged_update') {
        return {
          launched: true,
          silent: true,
          mode: 'nsis-silent',
          message: 'Applying cached silent update now.',
        };
      }
      return null;
    });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          version: '2.6.0',
          tag: 'latest',
          repo: 'Supremeai-bd/supremeai-public',
          publishedAt: '2026-11-20T00:00:00Z',
          releasePageUrl: 'https://github.com/Supremeai-bd/supremeai-public/releases/tag/latest',
          webUrl: 'https://supremeai-studio.pages.dev',
          windowsExeUrl:
            'https://github.com/Supremeai-bd/supremeai-public/releases/download/latest/SupremeAI.Desktop_2.6.0_x64-setup.exe',
          androidApkUrl:
            'https://github.com/Supremeai-bd/supremeai-public/releases/download/latest/SupremeAI-Studio-app-universal-release.apk',
          vscodeVsixUrl:
            'https://github.com/Supremeai-bd/supremeai-public/releases/download/latest/supremeai-vscode-2.6.0.vsix',
          provenance: 'manifest',
          assets: [],
        }),
        { status: 200 }
      )
    );

    const state = await checkAndStageBackgroundUpdate(true);
    expect(state.status).toBe('ready');
    expect(state.silentSupported).toBe(true);
    expect(state.stagedFilePath).toContain('SupremeAI.Desktop_2.6.0_x64-setup.exe');
    expect(invokeMock).toHaveBeenCalledWith('stage_silent_update', {
      url: 'https://github.com/Supremeai-bd/supremeai-public/releases/download/latest/SupremeAI.Desktop_2.6.0_x64-setup.exe',
      fileName: 'SupremeAI.Desktop_2.6.0_x64-setup.exe',
    });

    const applied = await applyReadyUpdate();
    expect(applied?.launched).toBe(true);
    expect(applied?.silent).toBe(true);
    expect(getUpdateState().status).toBe('applying');
  });
});
