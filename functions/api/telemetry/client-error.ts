/**
 * Client error sink.
 *
 * The browser reporter (`src/services/telemetry.ts`) posts here and never
 * retries; this handler only needs to acknowledge. Reports are capped and
 * scrubbed so a noisy client cannot flood the Pages logs or store PII: the
 * body is truncated, only the documented fields survive, and the auth token
 * is never part of the payload.
 */

import type { PagesContext } from '../../_lib/edgeHelpers';

const MAX_BODY_BYTES = 8 * 1024;

interface ClientErrorPayload {
  message?: string;
  stack?: string;
  source?: string;
  release?: string;
  url?: string;
  route?: string;
  at?: string;
  context?: Record<string, unknown>;
}

export async function onRequest(context: PagesContext): Promise<Response> {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  if (request.method !== 'POST') {
    return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  }

  const raw = await request.text().catch(() => '');
  if (raw.length > MAX_BODY_BYTES) {
    return new Response(null, { status: 413 });
  }

  let payload: ClientErrorPayload = {};
  try {
    payload = raw ? (JSON.parse(raw) as ClientErrorPayload) : {};
  } catch {
    // Malformed report: acknowledge anyway, the client must never retry.
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  }

  const summary = {
    message: String(payload.message ?? 'unknown').slice(0, 300),
    source: String(payload.source ?? 'app').slice(0, 40),
    release: payload.release ? String(payload.release).slice(0, 40) : undefined,
    route: payload.route ? String(payload.route).slice(0, 120) : undefined,
    at: payload.at ? String(payload.at).slice(0, 40) : new Date().toISOString(),
    contextKeys:
      payload.context && typeof payload.context === 'object'
        ? Object.keys(payload.context).slice(0, 10)
        : [],
  };

  console.warn('[client-error]', JSON.stringify(summary));

  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}
