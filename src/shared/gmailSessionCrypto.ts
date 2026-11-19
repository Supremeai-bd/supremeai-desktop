/**
 * Shared AES-256-GCM HttpOnly cookie sealing utilities for Gmail OAuth sessions.
 * Keeps OAuth access tokens strictly out of localStorage/sessionStorage while
 * persisting across browser reloads on both Express and Cloudflare Pages Edge.
 */

export const GMAIL_SESSION_COOKIE_NAME = 'supremeai_gmail_session';
export const GMAIL_SESSION_TTL_SECONDS = 55 * 60; // 55 minutes (matches Google 1h OAuth lifetime)

export interface GmailSessionPayload {
  accessToken: string;
  uid: string;
  email: string;
  exp: number;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(b64u: string): Uint8Array {
  const normalized = b64u.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveAesKey(secret: string): Promise<CryptoKey | null> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle || !secret) return null;
  const hash = await subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function sealGmailSessionCookie(
  payload: Omit<GmailSessionPayload, 'exp'> & { exp?: number },
  secret: string
): Promise<string | null> {
  const key = await deriveAesKey(secret);
  const subtle = globalThis.crypto?.subtle;
  if (!key || !subtle) return null;

  const fullPayload: GmailSessionPayload = {
    accessToken: payload.accessToken,
    uid: payload.uid || '',
    email: payload.email || '',
    exp:
      typeof payload.exp === 'number' ? payload.exp : Date.now() + GMAIL_SESSION_TTL_SECONDS * 1000,
  };

  const iv = new Uint8Array(12);
  globalThis.crypto.getRandomValues(iv);
  const encoded = new TextEncoder().encode(JSON.stringify(fullPayload));
  const cipher = await subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  return `${bytesToBase64Url(iv)}.${bytesToBase64Url(new Uint8Array(cipher))}`;
}

export async function unsealGmailSessionCookie(
  tokenValue: string,
  secret: string
): Promise<GmailSessionPayload | null> {
  if (!tokenValue || !secret) return null;
  const parts = tokenValue.split('.');
  if (parts.length !== 2) return null;

  try {
    const key = await deriveAesKey(secret);
    const subtle = globalThis.crypto?.subtle;
    if (!key || !subtle) return null;

    const iv = base64UrlToBytes(parts[0]);
    const cipherBytes = base64UrlToBytes(parts[1]);
    const ivBuf = iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer;
    const cipherBuf = cipherBytes.buffer.slice(
      cipherBytes.byteOffset,
      cipherBytes.byteOffset + cipherBytes.byteLength
    ) as ArrayBuffer;

    const plainBuf = await subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(ivBuf) },
      key,
      cipherBuf
    );
    const parsed = JSON.parse(new TextDecoder().decode(plainBuf)) as Partial<GmailSessionPayload>;
    if (
      !parsed ||
      typeof parsed.accessToken !== 'string' ||
      !parsed.accessToken ||
      typeof parsed.exp !== 'number' ||
      parsed.exp <= Date.now()
    ) {
      return null;
    }

    return {
      accessToken: parsed.accessToken,
      uid: typeof parsed.uid === 'string' ? parsed.uid : '',
      email: typeof parsed.email === 'string' ? parsed.email : '',
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}

export function parseCookieFromHeader(
  cookieHeader: string | null | undefined,
  targetName: string
): string | null {
  if (!cookieHeader || !targetName) return null;
  const pairs = cookieHeader.split(';');
  for (const rawPair of pairs) {
    const trimmed = rawPair.trim();
    if (!trimmed) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx <= 0) continue;
    const name = trimmed.slice(0, eqIdx).trim();
    if (name === targetName) {
      return decodeURIComponent(trimmed.slice(eqIdx + 1).trim());
    }
  }
  return null;
}

export function buildGmailSessionSetCookie(
  cookieValue: string,
  maxAgeSeconds: number,
  isHttps: boolean
): string {
  const encoded = encodeURIComponent(cookieValue);
  const parts = [
    `${GMAIL_SESSION_COOKIE_NAME}=${encoded}`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`,
  ];
  if (isHttps) {
    // Partitioned (CHIPS) allows the HttpOnly cookie to survive reloads inside HTTPS preview iframes
    parts.push('SameSite=None', 'Secure', 'Partitioned');
  } else {
    parts.push('SameSite=Lax');
  }
  return parts.join('; ');
}
