import { PagesContext, handleCorsPreflight, jsonEdgeResponse } from '../../_lib/edgeHelpers';

function encodeBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeBase64Url(encoded: string): string | null {
  try {
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (padded.length % 4)) % 4;
    const binary = atob(padded + '='.repeat(padLen));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export async function onRequest(context: PagesContext): Promise<Response> {
  const { request } = context;
  if (request.method === 'OPTIONS') return handleCorsPreflight(request);

  const incomingUrl = new URL(request.url);
  const sub = incomingUrl.pathname.replace(/^\/api\/share\/?/, '').trim();

  if (sub === 'generate' && request.method === 'POST') {
    const body = (await request.json().catch(() => ({}))) as {
      title?: string;
      content?: string;
      messages?: unknown[];
    };
    const token = encodeBase64Url(
      JSON.stringify({
        title: body.title || 'Shared Conversation',
        content: body.content || '',
        messages: Array.isArray(body.messages) ? body.messages : [],
        createdAt: new Date().toISOString(),
      })
    );
    return jsonEdgeResponse(
      {
        id: token,
        share_url: `${incomingUrl.origin}/?share=${encodeURIComponent(token)}#chat`,
        mode: 'edge-stateless',
      },
      200,
      request
    );
  }

  if (sub && request.method === 'GET') {
    const decoded = decodeBase64Url(decodeURIComponent(sub));
    if (decoded) {
      try {
        const payload = JSON.parse(decoded);
        return jsonEdgeResponse({ id: sub, ...payload, status: 'ok' }, 200, request);
      } catch {
        // Fall through
      }
    }
    return jsonEdgeResponse({ id: sub, content: '', status: 'not_found' }, 404, request);
  }

  return jsonEdgeResponse({ error: 'Method not allowed' }, 405, request);
}
