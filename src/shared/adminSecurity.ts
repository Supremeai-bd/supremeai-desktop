import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Admin session cookie helpers for the Cloudflare Pages / Next.js edge surface.
 *
 * This module is intentionally framework-light: it only relies on the Web Crypto
 * compatible `node:crypto` primitives, so it can be imported from Cloudflare
 * Pages Functions, Next.js route handlers and plain Node alike. Callers pass the
 * incoming cookie header instead of a framework-specific request object.
 */

export const ADMIN_SESSION_COOKIE = 'supremeai_admin_session';
export const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;

function configuredSecret(): string | null {
  const secret =
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.ADMIN_ACCESS_TOKEN?.trim() ||
    process.env.SUPREMEAI_ADMIN_TOKEN?.trim() ||
    process.env.ADMIN_PASSWORD?.trim() ||
    '';
  return secret.length > 0 ? secret : null;
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

function sessionSignature(expiresAt: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(`${ADMIN_SESSION_COOKIE}:${expiresAt}`)
    .digest('base64url');
}

function readCookie(cookieHeader: string | null | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    if (part.slice(0, index).trim() !== name) continue;
    return decodeURIComponent(part.slice(index + 1).trim());
  }
  return null;
}

/** True when an admin secret is configured. Auth fails closed otherwise. */
export function adminAuthConfigured(): boolean {
  return configuredSecret() !== null;
}

/** Constant-time comparison of a presented admin token against the configured secret. */
export function verifyAdminAccessToken(candidate: string): boolean {
  const secret = configuredSecret();
  if (!secret) return false;
  const clean = String(candidate || '').trim();
  if (!clean) return false;
  return constantTimeEqual(clean, secret);
}

/** Signed `${expiresAt}.${signature}` cookie value, or null when no secret is configured. */
export function createAdminSessionCookieValue(): string | null {
  const secret = configuredSecret();
  if (!secret) return null;
  const expiresAt = String(Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS);
  return `${expiresAt}.${sessionSignature(expiresAt, secret)}`;
}

/** Verifies the signed admin session cookie carried by `cookieHeader`. */
export function hasAdminSession(cookieHeader: string | null | undefined): boolean {
  const secret = configuredSecret();
  if (!secret) return false;
  const value = readCookie(cookieHeader, ADMIN_SESSION_COOKIE);
  if (!value) return false;

  const [expiresAt, signature, extra] = value.split('.');
  if (!expiresAt || !signature || extra || !/^\d+$/.test(expiresAt)) return false;
  if (Number(expiresAt) <= Math.floor(Date.now() / 1000)) return false;
  return constantTimeEqual(signature, sessionSignature(expiresAt, secret));
}
