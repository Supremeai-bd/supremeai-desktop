import {
  PagesContext,
  handleCorsPreflight,
  jsonEdgeResponse,
  resolveUpstreamOrigin,
  mintOrExtractAuthHeaders,
  extractLlmCompletionText,
} from '../_lib/edgeHelpers';

export async function onRequest(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return handleCorsPreflight(request);
  if (request.method !== 'POST') {
    return jsonEdgeResponse({ error: 'Method not allowed' }, 405, request);
  }

  const body = (await request.json().catch(() => ({}))) as {
    model?: string;
    messages?: Array<{
      role: string;
      content: string | Array<Record<string, unknown>>;
      attachment?: { name?: string; mimeType?: string; data?: string };
      attachments?: Array<{ name?: string; mimeType?: string; data?: string }>;
      parts?: unknown[];
    }>;
    systemInstruction?: string;
    groundingContext?: string;
    language?: 'en' | 'bn';
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    thinking_budget?: number;
    run_config?: Record<string, unknown>;
  };

  const rawMessages = Array.isArray(body.messages) ? body.messages : [];
  if (rawMessages.length === 0) {
    return jsonEdgeResponse({ error: 'messages array is required.' }, 400, request);
  }

  const upstreamMessages: Array<{
    role: string;
    content: string | Array<Record<string, unknown>>;
    attachment?: { name?: string; mimeType?: string; data?: string };
    attachments?: Array<{ name?: string; mimeType?: string; data?: string }>;
    parts?: unknown[];
  }> = [];
  if (body.systemInstruction?.trim()) {
    upstreamMessages.push({ role: 'system', content: body.systemInstruction.trim() });
  }
  if (body.groundingContext?.trim()) {
    upstreamMessages.push({
      role: 'system',
      content: `Grounding Context:\n${body.groundingContext.trim()}`,
    });
  }
  for (const m of rawMessages) {
    if (m && (typeof m.content === 'string' || Array.isArray(m.content))) {
      upstreamMessages.push({
        role: m.role || 'user',
        content: m.content,
        ...(m.attachment ? { attachment: m.attachment } : {}),
        ...(Array.isArray(m.attachments) ? { attachments: m.attachments } : {}),
        ...(Array.isArray(m.parts) ? { parts: m.parts } : {}),
      });
    }
  }

  try {
    const upstreamOrigin = resolveUpstreamOrigin(env);
    const authHeaders = await mintOrExtractAuthHeaders(request, upstreamOrigin);
    const text = await extractLlmCompletionText(
      upstreamOrigin,
      authHeaders,
      {
        model: body.model || 'supreme-spark',
        messages: upstreamMessages,
        language: body.language || 'en',
        ...(typeof body.temperature === 'number' ? { temperature: body.temperature } : {}),
        ...(typeof body.top_p === 'number' ? { top_p: body.top_p } : {}),
        ...(typeof body.max_tokens === 'number' ? { max_tokens: body.max_tokens } : {}),
        ...(typeof body.thinking_budget === 'number'
          ? { thinking_budget: body.thinking_budget }
          : {}),
        ...(body.run_config ? { run_config: body.run_config } : {}),
      },
      18000
    );

    if (!text) {
      return jsonEdgeResponse(
        { error: 'Upstream gateway returned an empty completion response.' },
        502,
        request
      );
    }

    return jsonEdgeResponse(
      { text, model: body.model || 'supreme-spark', source: 'edge-chat' },
      200,
      request
    );
  } catch (err: unknown) {
    return jsonEdgeResponse(
      { error: err instanceof Error ? err.message : 'Synchronous chat fallback failed.' },
      502,
      request
    );
  }
}
