export interface PagesContext {
  request: Request;
  env?: Record<string, string | undefined>;
  params?: Record<string, string | string[] | undefined>;
}

export const DEFAULT_UPSTREAM_ORIGIN = 'https://supremeai-api-ulw0.onrender.com';
export const DEFAULT_MCP_TOWER_ORIGIN = 'https://supremeai-mcp-tower.onrender.com';

export function resolveUpstreamOrigin(env?: Record<string, string | undefined>): string {
  return (env?.SUPREMEAI_BACKEND_URL || DEFAULT_UPSTREAM_ORIGIN).replace(/\/+$/, '');
}

export function resolveMcpTowerOrigin(env?: Record<string, string | undefined>): string {
  return (env?.SUPREMEAI_MCP_TOWER_ORIGIN || DEFAULT_MCP_TOWER_ORIGIN).replace(/\/+$/, '');
}

export function resolveMcpRpcUrl(env?: Record<string, string | undefined>): string {
  if (env?.SUPREMEAI_MCP_TOWER_URL?.trim()) {
    return env.SUPREMEAI_MCP_TOWER_URL.trim();
  }
  const agentKey = env?.MCP_TOWER_AGENT_KEY?.trim() || 'federated_bridge_agent';
  return `${resolveMcpTowerOrigin(env)}/agents/${agentKey}/mcp`;
}

export function applyCorsHeaders(headers: Headers, requestOrigin: string): void {
  headers.set('Access-Control-Allow-Origin', requestOrigin || '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-SupremeAI-Key, Accept, Cache-Control, X-Vault-Cookie'
  );
  headers.set(
    'Access-Control-Expose-Headers',
    'X-SupremeAI-Provider, X-SupremeAI-Slot, X-SupremeAI-Tier, X-SupremeAI-Cache'
  );
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Vary', 'Origin');
}

export function handleCorsPreflight(request: Request): Response {
  const incomingUrl = new URL(request.url);
  const requestOrigin = request.headers.get('Origin') || incomingUrl.origin;
  const headers = new Headers({ 'Access-Control-Max-Age': '86400' });
  applyCorsHeaders(headers, requestOrigin);
  return new Response(null, { status: 204, headers });
}

export function jsonEdgeResponse(
  data: unknown,
  status: number,
  request: Request,
  extraHeaders?: Record<string, string>
): Response {
  const incomingUrl = new URL(request.url);
  const requestOrigin = request.headers.get('Origin') || incomingUrl.origin;
  const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8' });
  if (extraHeaders) {
    for (const [k, v] of Object.entries(extraHeaders)) {
      headers.set(k, v);
    }
  }
  applyCorsHeaders(headers, requestOrigin);
  return new Response(JSON.stringify(data), { status, headers });
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = 8500
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function mintOrExtractAuthHeaders(
  request: Request,
  upstreamOrigin: string
): Promise<Record<string, string>> {
  const out: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  const auth = request.headers.get('Authorization');
  const key = request.headers.get('X-SupremeAI-Key');
  const cookie = request.headers.get('Cookie');

  if (auth) out['Authorization'] = auth;
  if (key) out['X-SupremeAI-Key'] = key;
  if (cookie) out['Cookie'] = cookie;

  if (!auth && !key) {
    try {
      const guestRes = await fetchWithTimeout(
        `${upstreamOrigin}/api/v1/auth/guest`,
        {
          method: 'POST',
          headers: { Accept: 'application/json' },
        },
        4500
      );
      if (guestRes.ok) {
        const guestJson = (await guestRes.json().catch(() => null)) as {
          access_token?: string;
          token?: string;
        } | null;
        const token = guestJson?.access_token || guestJson?.token;
        if (token) {
          out['Authorization'] = `Bearer ${token}`;
          out['X-SupremeAI-Key'] = token;
        }
      }
    } catch {
      // Proceed cleanly without guest token
    }
  }

  return out;
}

export async function forwardRawUpstream(
  request: Request,
  upstreamOrigin: string,
  targetPathAndSearch: string,
  timeoutMs: number = 9000
): Promise<Response> {
  const headers = new Headers();
  const forwardKeys = ['authorization', 'x-supremeai-key', 'cookie', 'content-type', 'accept'];
  for (const k of forwardKeys) {
    const val = request.headers.get(k);
    if (val) headers.set(k, val);
  }

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  const body = hasBody ? await request.arrayBuffer().catch(() => undefined) : undefined;

  return fetchWithTimeout(
    `${upstreamOrigin}${targetPathAndSearch}`,
    {
      method: request.method,
      headers,
      body: hasBody ? body : undefined,
    },
    timeoutMs
  );
}

// --- Lightweight MCP JSON-RPC 2.0 Client (Edge Web Standards) ---
function parseMcpSseOrJson(raw: string): any {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return JSON.parse(trimmed);
  }
  const dataLines = trimmed
    .split(/\r?\n/)
    .filter((l) => l.startsWith('data:'))
    .map((l) => l.slice(5).trim())
    .filter(Boolean);
  for (let i = dataLines.length - 1; i >= 0; i--) {
    try {
      return JSON.parse(dataLines[i]);
    } catch {
      // continue checking prior frames
    }
  }
  return null;
}

export async function callMcpTowerRpc(
  env: Record<string, string | undefined> | undefined,
  method: 'tools/list' | 'tools/call' | 'resources/list' | 'resources/read',
  params: Record<string, unknown> = {},
  timeoutMs: number = 8500
): Promise<any> {
  const rpcUrl = resolveMcpRpcUrl(env);
  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  };
  if (env?.SUPREMEAI_TOWER_TOKEN?.trim()) {
    baseHeaders['Authorization'] = `Bearer ${env.SUPREMEAI_TOWER_TOKEN.trim()}`;
  }

  const initRes = await fetchWithTimeout(
    rpcUrl,
    {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'supremeai-pages-edge-bridge', version: '2.4.0' },
        },
      }),
    },
    6500
  );

  if (!initRes.ok) {
    throw new Error(`MCP initialize returned HTTP ${initRes.status}`);
  }

  const sid = initRes.headers.get('mcp-session-id');
  const callHeaders: Record<string, string> = {
    ...baseHeaders,
    ...(sid ? { 'mcp-session-id': sid } : {}),
  };

  await fetchWithTimeout(
    rpcUrl,
    {
      method: 'POST',
      headers: callHeaders,
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    },
    3000
  ).catch(() => {});

  const rpcRes = await fetchWithTimeout(
    rpcUrl,
    {
      method: 'POST',
      headers: callHeaders,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params,
      }),
    },
    timeoutMs
  );

  if (!rpcRes.ok) {
    throw new Error(`MCP ${method} failed with HTTP ${rpcRes.status}`);
  }

  const rawText = await rpcRes.text();
  const parsed = parseMcpSseOrJson(rawText);
  if (!parsed) {
    throw new Error(`Unparseable MCP payload for ${method}`);
  }
  if (parsed.error) {
    throw new Error(parsed.error.message || JSON.stringify(parsed.error));
  }
  return parsed.result;
}

// --- WebCrypto RFC 6238 TOTP Helpers ---
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateEdgeBase32Secret(byteLength: number = 20): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function decodeBase32ToBytes(input: string): Uint8Array {
  const normalized = String(input || '')
    .toUpperCase()
    .replace(/[\s-]+/g, '')
    .replace(/=+$/, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (let i = 0; i < normalized.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(normalized[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

export async function generateEdgeHotp(
  secretBytes: Uint8Array,
  counter: number,
  digits: number = 6
): Promise<string> {
  const msg = new Uint8Array(8);
  let rem = BigInt(counter);
  for (let i = 7; i >= 0; i--) {
    msg[i] = Number(rem & 0xffn);
    rem >>= 8n;
  }

  const keyMaterial = new Uint8Array(secretBytes);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, msg));
  const offset = sig[sig.length - 1] & 0x0f;
  const binary =
    ((sig[offset] & 0x7f) << 24) |
    ((sig[offset + 1] & 0xff) << 16) |
    ((sig[offset + 2] & 0xff) << 8) |
    (sig[offset + 3] & 0xff);
  return String(binary % 10 ** digits).padStart(digits, '0');
}

export async function verifyEdgeTotpToken(
  base32Secret: string,
  code: string,
  windowSteps: number = 1
): Promise<boolean> {
  const cleanCode = String(code || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleanCode)) return false;
  const keyBytes = decodeBase32ToBytes(base32Secret);
  if (keyBytes.length === 0) return false;
  const currentStep = Math.floor(Date.now() / 1000 / 30);
  for (let offset = -windowSteps; offset <= windowSteps; offset++) {
    const candidate = await generateEdgeHotp(keyBytes, currentStep + offset, 6);
    if (candidate === cleanCode) return true;
  }
  return false;
}

export async function extractLlmCompletionText(
  upstreamOrigin: string,
  authHeaders: Record<string, string>,
  payload: Record<string, unknown>,
  timeoutMs: number = 14000
): Promise<string> {
  // 1. Try OpenAI-compatible non-streaming /v1/chat/completions
  const nonStreamRes = await fetchWithTimeout(
    `${upstreamOrigin}/v1/chat/completions`,
    {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ ...payload, stream: false }),
    },
    timeoutMs
  ).catch(() => null);

  if (nonStreamRes?.ok) {
    const json = (await nonStreamRes.json().catch(() => null)) as any;
    const text =
      json?.choices?.[0]?.message?.content ?? json?.choices?.[0]?.text ?? json?.text ?? '';
    if (typeof text === 'string' && text.trim()) {
      return text.trim();
    }
  }

  // 2. Fallback to collecting SSE from /api/v1/stream/chat
  const streamRes = await fetchWithTimeout(
    `${upstreamOrigin}/api/v1/stream/chat`,
    {
      method: 'POST',
      headers: {
        ...authHeaders,
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({ ...payload, stream: true }),
    },
    timeoutMs
  ).catch(() => null);

  if (!streamRes?.ok || !streamRes.body) return '';
  const reader = streamRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let collected = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const dataStr = trimmed.slice(5).trim();
      if (dataStr === '[DONE]') break;
      try {
        const parsed = JSON.parse(dataStr);
        const chunk = parsed?.choices?.[0]?.delta?.content ?? parsed?.text ?? '';
        if (typeof chunk === 'string') collected += chunk;
      } catch {
        // Ignore partial frames
      }
    }
  }

  return collected.trim();
}
