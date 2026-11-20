import { fetch } from 'undici'; // or node fetch
import { DEFAULT_MCP_TOWER_ORIGIN } from '../config/platformEndpoints';

export async function callMcpTowerRpc(path: string, body?: any, headers?: Record<string, string>) {
  const origin = process.env.SUPREMEAI_MCP_TOWER_URL?.trim() || DEFAULT_MCP_TOWER_ORIGIN;
  const url = `${origin.replace(/\/+$/, '')}${path.startsWith('/') ? path : '/' + path}`;
  
  const res = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(5000), // 5s timeout from functions/_lib/edgeHelpers.ts
  });

  if (!res.ok) {
    throw new Error(`MCP Tower RPC failed: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

export async function probeMcpTowerHealth() {
  try {
    const start = Date.now();
    const res = await fetch(`${DEFAULT_MCP_TOWER_ORIGIN}/health`, { signal: AbortSignal.timeout(2500) });
    const duration = Date.now() - start;
    return { ok: res.ok, duration, status: res.status };
  } catch (e) {
    return { ok: false, duration: 2500, error: e.message };
  }
}
