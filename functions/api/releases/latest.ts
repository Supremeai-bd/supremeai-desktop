import { PagesContext, handleCorsPreflight, jsonEdgeResponse, fetchWithTimeout } from '../../_lib/edgeHelpers';
import { DEFAULT_RELEASE_MANIFEST } from '../../../src/config/releaseDownloads';
import {
  DEFAULT_WEB_STUDIO_URL,
  GITHUB_MONOREPO_SLUG,
  GITHUB_PUBLIC_REPO_SLUG,
} from '../../../src/config/platformEndpoints';

export async function onRequest(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return handleCorsPreflight(request, env);

  const reposToCheck = [GITHUB_PUBLIC_REPO_SLUG, GITHUB_MONOREPO_SLUG];
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'SupremeAI-Edge-Release-Resolver',
  };
  if (env?.GITHUB_READONLY_TOKEN?.trim()) {
    headers['Authorization'] = `Bearer ${env.GITHUB_READONLY_TOKEN.trim()}`;
  }

  for (const repoSlug of reposToCheck) {
    try {
      const ghRes = await fetchWithTimeout(
        `https://api.github.com/repos/${repoSlug}/releases/latest`,
        { headers },
        5000
      );
      if (!ghRes.ok) continue;

      const release = (await ghRes.json().catch(() => null)) as any;
      const assets: any[] = Array.isArray(release?.assets) ? release.assets : [];

      const manifestAsset = assets.find(
        (a) => a?.name === 'latest-release.json' || a?.name === 'latest-desktop.json'
      );
      if (manifestAsset?.browser_download_url) {
        const mfRes = await fetchWithTimeout(manifestAsset.browser_download_url, {}, 4500).catch(
          () => null
        );
        if (mfRes?.ok) {
          const mf = (await mfRes.json().catch(() => null)) as any;
          if (mf && mf.version) {
            return jsonEdgeResponse(
              {
                version: String(mf.version),
                tag: String(mf.tag || release.tag_name || 'latest'),
                repo: repoSlug,
                publishedAt: String(mf.pub_date || release.published_at || ''),
                releasePageUrl: String(
                  mf.downloads?.releasePageUrl ||
                    release.html_url ||
                    DEFAULT_RELEASE_MANIFEST.releasePageUrl
                ),
                webUrl: String(mf.downloads?.webUrl || DEFAULT_WEB_STUDIO_URL),
                windowsExeUrl: String(
                  mf.downloads?.windowsExeUrl ||
                    mf.platforms?.['windows-x86_64']?.url ||
                    DEFAULT_RELEASE_MANIFEST.windowsExeUrl
                ),
                windowsMsiUrl: String(
                  mf.downloads?.windowsMsiUrl ||
                    mf.platforms?.['windows-msi']?.url ||
                    DEFAULT_RELEASE_MANIFEST.windowsMsiUrl
                ),
                androidApkUrl: String(
                  mf.downloads?.androidApkUrl ||
                    mf.platforms?.['android-arm64']?.url ||
                    mf.platforms?.['android-apk']?.url ||
                    DEFAULT_RELEASE_MANIFEST.androidApkUrl
                ),
                androidArmv7ApkUrl: mf.downloads?.androidArmv7ApkUrl
                  ? String(mf.downloads.androidArmv7ApkUrl)
                  : undefined,
                provenance: 'manifest',
                assets: DEFAULT_RELEASE_MANIFEST.assets,
              },
              200,
              request,
              { 'Cache-Control': 'public, max-age=300' },
              env
            );
          }
        }
      }

      const exeAsset = assets.find((a) => String(a?.name || '').endsWith('.exe'));
      const msiAsset = assets.find((a) => String(a?.name || '').endsWith('.msi'));
      const arm64Apk =
        assets.find(
          (a) =>
            String(a?.name || '').endsWith('.apk') && /arm64|aarch64/i.test(String(a?.name || ''))
        ) || assets.find((a) => String(a?.name || '').endsWith('.apk'));
      const armv7Apk = assets.find(
        (a) =>
          String(a?.name || '').endsWith('.apk') && /armv7|armeabi/i.test(String(a?.name || ''))
      );

      if (exeAsset || arm64Apk) {
        const tag = String(release.tag_name || 'latest');
        return jsonEdgeResponse(
          {
            version: tag.replace(/^v/i, '') || DEFAULT_RELEASE_MANIFEST.version,
            tag,
            repo: repoSlug,
            publishedAt: String(release.published_at || ''),
            releasePageUrl: String(release.html_url || DEFAULT_RELEASE_MANIFEST.releasePageUrl),
            webUrl: DEFAULT_WEB_STUDIO_URL,
            windowsExeUrl: String(
              exeAsset?.browser_download_url || DEFAULT_RELEASE_MANIFEST.windowsExeUrl
            ),
            windowsMsiUrl: String(
              msiAsset?.browser_download_url || DEFAULT_RELEASE_MANIFEST.windowsMsiUrl
            ),
            androidApkUrl: String(
              arm64Apk?.browser_download_url || DEFAULT_RELEASE_MANIFEST.androidApkUrl
            ),
            androidArmv7ApkUrl: armv7Apk?.browser_download_url
              ? String(armv7Apk.browser_download_url)
              : undefined,
            provenance: 'live-github',
            assets: assets
              .filter((a) => /\.(exe|msi|apk)$/i.test(String(a?.name || '')))
              .map((a) => ({
                platform: String(a.name).endsWith('.exe')
                  ? 'windows-exe'
                  : String(a.name).endsWith('.msi')
                    ? 'windows-msi'
                    : /armv7|armeabi/i.test(String(a.name))
                      ? 'android-apk-armv7'
                      : 'android-apk-arm64',
                label: String(a.name),
                fileName: String(a.name),
                url: String(a.browser_download_url),
                sizeBytes: typeof a.size === 'number' ? a.size : undefined,
              })),
          },
          200,
          request,
          { 'Cache-Control': 'public, max-age=300' },
          env
        );
      }
    } catch {
      // Try next repo slug
    }
  }

  return jsonEdgeResponse(
    DEFAULT_RELEASE_MANIFEST,
    200,
    request,
    { 'Cache-Control': 'public, max-age=120' },
    env
  );
}
