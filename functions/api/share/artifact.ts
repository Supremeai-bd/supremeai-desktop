import { PagesContext, handleCorsPreflight, jsonEdgeResponse } from '../../_lib/edgeHelpers';

function encodeBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function onRequest(context: PagesContext): Promise<Response> {
  const { request } = context;
  if (request.method === 'OPTIONS') return handleCorsPreflight(request);

  const incomingUrl = new URL(request.url);

  if (request.method === 'POST') {
    const body = (await request.json().catch(() => null)) as {
      code?: string;
      lang?: string;
      title?: string;
      createdAt?: number;
    } | null;

    if (!body || typeof body.code !== 'string' || !body.code.trim()) {
      return jsonEdgeResponse({ error: 'Artifact code is required.' }, 400, request);
    }

    const token = encodeBase64Url(
      JSON.stringify({
        code: body.code,
        lang: (body.lang || 'html').toLowerCase(),
        title: body.title || 'SupremeAI App',
        createdAt: body.createdAt || Date.now(),
      })
    );

    const shareUrl = `${incomingUrl.origin}/?artifact=${token}#chat`;
    return jsonEdgeResponse(
      {
        id: `art_${Date.now().toString(36)}`,
        share_url: shareUrl,
        mode: 'edge-permalink',
      },
      200,
      request
    );
  }

  return jsonEdgeResponse({ status: 'ok', mode: 'edge-permalink' }, 200, request);
}
