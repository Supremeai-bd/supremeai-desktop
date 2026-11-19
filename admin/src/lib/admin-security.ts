import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const ADMIN_SESSION_COOKIE = "supremeai_admin_session";
export const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;
const MINIMUM_SECRET_LENGTH = 32;

function configuredSecret(): string | null {
  const secret =
    process.env.ADMIN_ACCESS_TOKEN?.trim() || process.env.SUPREMEAI_ADMIN_TOKEN?.trim() || "";
  return secret.length >= MINIMUM_SECRET_LENGTH ? secret : null;
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

function sessionSignature(expiresAt: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`${ADMIN_SESSION_COOKIE}:${expiresAt}`)
    .digest("base64url");
}

export function adminAuthConfigured(): boolean {
  return configuredSecret() !== null;
}

export function verifyAdminAccessToken(candidate: string): boolean {
  const secret = configuredSecret();
  return Boolean(secret && constantTimeEqual(candidate, secret));
}

export function createAdminSessionCookieValue(): string | null {
  const secret = configuredSecret();
  if (!secret) return null;
  const expiresAt = String(Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS);
  return `${expiresAt}.${sessionSignature(expiresAt, secret)}`;
}

export function hasAdminSession(request: NextRequest): boolean {
  const secret = configuredSecret();
  const value = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!secret || !value) return false;

  const [expiresAt, signature, extra] = value.split(".");
  if (!expiresAt || !signature || extra || !/^\d+$/.test(expiresAt)) return false;
  if (Number(expiresAt) <= Math.floor(Date.now() / 1000)) return false;
  return constantTimeEqual(signature, sessionSignature(expiresAt, secret));
}
