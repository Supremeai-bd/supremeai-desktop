import {
  PagesContext,
  handleCorsPreflight,
  jsonEdgeResponse,
  resolveUpstreamOrigin,
  resolveMcpTowerOrigin,
  fetchWithTimeout,
} from '../../_lib/edgeHelpers';

interface ProbeResult {
  id: string;
  label: string;
  status: 'online' | 'degraded' | 'offline';
  latencyMs: number;
  httpStatus: number;
  endpoint: string;
  region: string;
}

async function probeTarget(
  id: string,
  label: string,
  url: string,
  region: string
): Promise<ProbeResult> {
  const started = Date.now();
  try {
    const res = await fetchWithTimeout(
      url,
      { method: 'GET', headers: { Accept: 'application/json' } },
      5000
    );
    const latencyMs = Date.now() - started;
    return {
      id,
      label,
      status: res.ok ? (latencyMs > 2200 ? 'degraded' : 'online') : 'degraded',
      latencyMs,
      httpStatus: res.status,
      endpoint: url,
      region,
    };
  } catch {
    return {
      id,
      label,
      status: 'offline',
      latencyMs: Date.now() - started,
      httpStatus: 0,
      endpoint: url,
      region,
    };
  }
}

export async function onRequest(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return handleCorsPreflight(request);

  const upstreamOrigin = resolveUpstreamOrigin(env);
  const mcpOrigin = resolveMcpTowerOrigin(env);

  const [gatewayProbe, mcpProbe] = await Promise.all([
    probeTarget('supremeai-gateway', 'SupremeAI Gateway', `${upstreamOrigin}/health`, 'render-us'),
    probeTarget('supremeai-mcp-tower', 'MCP Control Tower', `${mcpOrigin}/health`, 'render-us'),
  ]);

  const list = [
    {
      provider: 'supremeai',
      label: 'SupremeAI Federation Gateway',
      status: gatewayProbe.status === 'online' ? 'healthy' : gatewayProbe.status,
      latencyMs: gatewayProbe.latencyMs,
      lastChecked: new Date().toISOString(),
      httpStatus: gatewayProbe.httpStatus,
    },
    {
      provider: 'mcp-tower',
      label: 'SupremeAI MCP Tower',
      status: mcpProbe.status === 'online' ? 'healthy' : mcpProbe.status,
      latencyMs: mcpProbe.latencyMs,
      lastChecked: new Date().toISOString(),
      httpStatus: mcpProbe.httpStatus,
    },
    {
      provider: 'edge-proxy',
      label: 'Cloudflare Pages Edge Runtime',
      status: 'healthy',
      latencyMs: 8,
      lastChecked: new Date().toISOString(),
      httpStatus: 200,
    },
  ];

  const providers: Record<string, unknown> = {};
  for (const item of list) {
    providers[item.provider] = item;
  }

  return jsonEdgeResponse(
    {
      gatewayStatus: gatewayProbe.status === 'online' ? 'healthy' : 'degraded',
      fetchedAt: new Date().toISOString(),
      providers,
      list,
    },
    200,
    request
  );
}
