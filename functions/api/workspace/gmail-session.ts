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
import { applyCorsHeaders } from '../../_lib/edgeHelpers';

interface PagesContext {
  request: Request;
  env?: Record<string, string | undefined>;
}

function getEdgeSecret(env: Record<string, string | undefined>): string {
  return (
    env.GMAIL_SESSION_SECRET?.trim() ||
    env.ADMIN_JWT_SECRET?.trim() ||
    env.SESSION_SECRET?.trim() ||
    ''
  );
}

function buildHeaders(
  requestOrigin: string | null,
  incomingOrigin: string,
  env: Record<string, string | undefined>,
  setCookie?: string
): Headers {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  applyCorsHeaders(headers, requestOrigin, incomingOrigin, env);
  if (setCookie) {
    headers.set('Set-Cookie', setCookie);
  }
  return headers;
}

export async function onRequest(context: PagesContext): Promise<Response> {
  const { request, env = {} } = context;
  const reqUrl = new URL(request.url);
  const requestOrigin = request.headers.get('Origin');
  const forwardedProto = (request.headers.get('x-forwarded-proto') || '').toLowerCase();
  const forwardedHeader = (request.headers.get('forwarded') || '').toLowerCase();
  const refererHeader = (request.headers.get('referer') || '').toLowerCase();
  const isHttps =
    reqUrl.protocol === 'https:' ||
    forwardedProto.includes('https') ||
    forwardedHeader.includes('proto=https') ||
    (requestOrigin || '').toLowerCase().startsWith('https://') ||
    refererHeader.startsWith('https://');
  const secret = getEdgeSecret(env);

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: buildHeaders(requestOrigin, reqUrl.origin, env),
    });
  }

  if (request.method === 'DELETE') {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: buildHeaders(
        requestOrigin,
        reqUrl.origin,
        env,
        buildGmailSessionSetCookie('', 0, isHttps)
      ),
    });
  }

  if (!secret || secret.length < 16) {
    return new Response(
      JSON.stringify({
        error: 'Gmail session sealing secret is not configured on the server.',
      }),
      {
        status: 503,
        headers: buildHeaders(requestOrigin, reqUrl.origin, env),
      }
    );
  }

  if (request.method === 'GET') {
    const rawCookie = parseCookieFromHeader(
      request.headers.get('cookie'),
      GMAIL_SESSION_COOKIE_NAME
    );
    if (!rawCookie) {
      return new Response(JSON.stringify({ authenticated: false }), {
        status: 401,
        headers: buildHeaders(requestOrigin, reqUrl.origin, env),
      });
    }
    const payload = await unsealGmailSessionCookie(rawCookie, secret);
    if (!payload) {
      return new Response(JSON.stringify({ authenticated: false }), {
        status: 401,
        headers: buildHeaders(
          requestOrigin,
          reqUrl.origin,
          env,
          buildGmailSessionSetCookie('', 0, isHttps)
        ),
      });
    }
    const requestedUid = (reqUrl.searchParams.get('uid') || '').trim();
    if (requestedUid && payload.uid && payload.uid !== requestedUid) {
      return new Response(JSON.stringify({ authenticated: false }), {
        status: 401,
        headers: buildHeaders(requestOrigin, reqUrl.origin, env),
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
      { status: 200, headers: buildHeaders(requestOrigin, reqUrl.origin, env) }
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
          headers: buildHeaders(requestOrigin, reqUrl.origin, env),
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
          headers: buildHeaders(requestOrigin, reqUrl.origin, env),
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
            requestOrigin,
            reqUrl.origin,
            env,
            buildGmailSessionSetCookie(sealed, GMAIL_SESSION_TTL_SECONDS, isHttps)
          ),
        }
      );
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload.' }), {
        status: 400,
        headers: buildHeaders(requestOrigin, reqUrl.origin, env),
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
    status: 405,
    headers: buildHeaders(requestOrigin, reqUrl.origin, env),
  });
}
