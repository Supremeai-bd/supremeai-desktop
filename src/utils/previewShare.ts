import { getRuntimeOrigin } from '../config/externalUrls';

export interface ArtifactSharePayload {
  code: string;
  lang: string;
  title?: string;
  createdAt?: number;
}

export interface PublishedArtifactResult {
  url: string;
  mode: 'server' | 'serverless';
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(base64Url: string): Uint8Array {
  const padded = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  const binary = atob(padded + '='.repeat(padLen));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function encodeArtifactSharePayload(payload: ArtifactSharePayload): string {
  const normalized: ArtifactSharePayload = {
    code: payload.code,
    lang: (payload.lang || 'html').toLowerCase(),
    title: payload.title || 'SupremeAI App',
    createdAt: payload.createdAt || Date.now(),
  };
  const json = JSON.stringify(normalized);
  const bytes = new TextEncoder().encode(json);
  return bytesToBase64Url(bytes);
}

export function decodeArtifactSharePayload(encoded: string): ArtifactSharePayload | null {
  try {
    const clean = encoded.trim();
    if (!clean) return null;
    const bytes = base64UrlToBytes(clean);
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as Partial<ArtifactSharePayload>;
    if (!parsed || typeof parsed.code !== 'string') return null;
    return {
      code: parsed.code,
      lang: typeof parsed.lang === 'string' && parsed.lang.trim() ? parsed.lang : 'html',
      title: typeof parsed.title === 'string' ? parsed.title : undefined,
      createdAt: typeof parsed.createdAt === 'number' ? parsed.createdAt : undefined,
    };
  } catch {
    return null;
  }
}

export function buildArtifactShareUrl(payload: ArtifactSharePayload, origin?: string): string {
  const base = origin || getRuntimeOrigin();
  const token = encodeArtifactSharePayload(payload);
  const prefix = base ? base.replace(/\/$/, '') : '';
  return `${prefix}/?artifact=${token}#chat`;
}

export async function publishPreviewArtifact(
  payload: ArtifactSharePayload
): Promise<PublishedArtifactResult> {
  const fallbackUrl = buildArtifactShareUrl(payload);

  // Attempt optional backend share storage when user is authenticated; seamlessly degrade to serverless URL
  if (typeof fetch !== 'undefined' && typeof localStorage !== 'undefined') {
    const token = localStorage.getItem('supremeai_access_token');
    if (token) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2500);
        const res = await fetch('/api/share/artifact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (res.ok) {
          const data = (await res.json()) as { share_url?: string };
          if (data && typeof data.share_url === 'string' && data.share_url.trim()) {
            return { url: data.share_url.trim(), mode: 'server' };
          }
        }
      } catch {
        // Fallback to stateless URL cleanly (100% compatible with Cloudflare Pages)
      }
    }
  }

  return { url: fallbackUrl, mode: 'serverless' };
}
