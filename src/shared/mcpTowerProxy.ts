import { DEFAULT_MCP_TOWER_ORIGIN } from '../config/platformEndpoints';

/**
 * Minimal MCP Tower RPC client shared by the web build, the desktop shell and
 * the edge functions. Uses the global `fetch` (Node 18+, Cloudflare Workers,
 * Tauri webview) so no extra runtime dependency is required.
 */

function resolveOrigin(): string {
  return (process.env.SUPREMEAI_MCP_TOWER_URL?.trim() || DEFAULT_MCP_TOWER_ORIGIN).replace(
    /\/+$/,
    ''
  );
}

export async function callMcpTowerRpc(
  path: string,
  body?: unknown,
  headers?: Record<string, string>
): Promise<unknown> {
  const url = `${resolveOrigin()}${path.startsWith('/') ? path : `/${path}`}`;

  const res = await fetch(url, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(headers || {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) {
    throw new Error(`MCP Tower RPC failed: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

export async function probeMcpTowerHealth(): Promise<
  { ok: true; duration: number; status: number } | { ok: false; duration: number; error: string }
> {
  const startedAt = Date.now();
  try {
    const res = await fetch(`${resolveOrigin()}/health`, {
      signal: AbortSignal.timeout(2500),
    });
    return { ok: true, duration: Date.now() - startedAt, status: res.status };
  } catch (error: unknown) {
    return {
      ok: false,
      duration: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
