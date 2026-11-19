/**
 * Cloudflare Pages Edge Function: `/api/workspace/gmail-session`
 * Persists a Google Workspace OAuth access token inside an AES-256-GCM sealed HttpOnly
 * cookie so page reloads restore Gmail access into memory without exposing tokens to
 * localStorage or sessionStorage.
 */
import {
  buildGmailSessionSetCookie,
  GMAIL_SESSION_COOKIE_NAME,
  GMAIL_SESSION_TTL_SECONDS,
  parseCookieFromHeader,
  sealGmailSessionCookie,
  unsealGmailSessionCookie,
} from '../../../src/shared/gmailSessionCrypto';

interface PagesContext {
  request: Request;
  env?: Record<string, string | undefined>;
}

function getEdgeSecret(env: Record<string, string | undefined>, origin: string): string {
  return (
    env.GMAIL_SESSION_SECRET?.trim() ||
    env.ADMIN_JWT_SECRET?.trim() ||
    env.SESSION_SECRET?.trim() ||
    `${origin}::${env.CLOUDFLARE_ACCOUNT_ID || 'supremeai-edge-seal'}`
  );
}

function buildHeaders(origin: string, setCookie?: string): Headers {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  });
  if (setCookie) {
    headers.set('Set-Cookie', setCookie);
  }
  return headers;
}

export async function onRequest(context: PagesContext): Promise<Response> {
  const { request, env = {} } = context;
  const reqUrl = new URL(request.url);
  const origin = request.headers.get('Origin') || reqUrl.origin;
  const forwardedProto = (request.headers.get('x-forwarded-proto') || '').toLowerCase();
  const forwardedHeader = (request.headers.get('forwarded') || '').toLowerCase();
  const refererHeader = (request.headers.get('referer') || '').toLowerCase();
  const isHttps =
    reqUrl.protocol === 'https:' ||
    forwardedProto.includes('https') ||
    forwardedHeader.includes('proto=https') ||
    origin.toLowerCase().startsWith('https://') ||
    refererHeader.startsWith('https://');
  const secret = getEdgeSecret(env, reqUrl.origin);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: buildHeaders(origin) });
  }

  if (request.method === 'GET') {
    const rawCookie = parseCookieFromHeader(
      request.headers.get('cookie'),
      GMAIL_SESSION_COOKIE_NAME
    );
    if (!rawCookie) {
      return new Response(JSON.stringify({ authenticated: false }), {
        status: 401,
        headers: buildHeaders(origin),
      });
    }
    const payload = await unsealGmailSessionCookie(rawCookie, secret);
    if (!payload) {
      return new Response(JSON.stringify({ authenticated: false }), {
        status: 401,
        headers: buildHeaders(origin, buildGmailSessionSetCookie('', 0, isHttps)),
      });
    }
    const requestedUid = (reqUrl.searchParams.get('uid') || '').trim();
    if (requestedUid && payload.uid && payload.uid !== requestedUid) {
      return new Response(JSON.stringify({ authenticated: false }), {
        status: 401,
        headers: buildHeaders(origin),
      });
    }
    return new Response(
      JSON.stringify({
        authenticated: true,
        accessToken: payload.accessToken,
        email: payload.email,
        uid: payload.uid,
        expiresAt: payload.exp,
      }),
      { status: 200, headers: buildHeaders(origin) }
    );
  }

  if (request.method === 'POST') {
    try {
      const body = (await request.json()) as {
        accessToken?: string;
        uid?: string;
        email?: string;
      };
      const accessToken = typeof body?.accessToken === 'string' ? body.accessToken.trim() : '';
      if (!accessToken) {
        return new Response(JSON.stringify({ error: 'accessToken is required.' }), {
          status: 400,
          headers: buildHeaders(origin),
        });
      }
      const sealed = await sealGmailSessionCookie(
        {
          accessToken,
          uid: typeof body.uid === 'string' ? body.uid.trim() : '',
          email: typeof body.email === 'string' ? body.email.trim() : '',
        },
        secret
      );
      if (!sealed) {
        return new Response(JSON.stringify({ error: 'Session encryption unavailable.' }), {
          status: 500,
          headers: buildHeaders(origin),
        });
      }
      return new Response(
        JSON.stringify({
          ok: true,
          expiresAt: Date.now() + GMAIL_SESSION_TTL_SECONDS * 1000,
        }),
        {
          status: 200,
          headers: buildHeaders(
            origin,
            buildGmailSessionSetCookie(sealed, GMAIL_SESSION_TTL_SECONDS, isHttps)
          ),
        }
      );
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload.' }), {
        status: 400,
        headers: buildHeaders(origin),
      });
    }
  }

  if (request.method === 'DELETE') {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: buildHeaders(origin, buildGmailSessionSetCookie('', 0, isHttps)),
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
    status: 405,
    headers: buildHeaders(origin),
  });
}
