import {
  PagesContext,
  handleCorsPreflight,
  jsonEdgeResponse,
  resolveUpstreamOrigin,
  fetchWithTimeout,
} from '../../_lib/edgeHelpers';

export async function onRequest(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return handleCorsPreflight(request);
  if (request.method !== 'POST') {
    return jsonEdgeResponse({ error: 'Method not allowed', exitCode: 1 }, 405, request);
  }

  const body = (await request.json().catch(() => ({}))) as { command?: string };
  const rawCommand = String(body.command || '').trim();
  if (!rawCommand) {
    return jsonEdgeResponse({ error: 'Command cannot be empty.', exitCode: 1 }, 400, request);
  }

  const parts = rawCommand.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);
  const upstreamOrigin = resolveUpstreamOrigin(env);

  if (cmd === 'help') {
    return jsonEdgeResponse(
      {
        exitCode: 0,
        runtimeEnv: 'cloudflare-pages-edge',
        stdout: [
          'SupremeAI Studio · Cloudflare Edge Shell',
          'Available Edge Commands:',
          '  help            Show supported edge commands',
          '  pwd             Print edge worker virtual root',
          '  whoami          Print active edge agent identity',
          '  date            Show current UTC timestamp',
          '  echo <text>     Print text to terminal',
          '  health / status Probe upstream SupremeAI gateway health & latency',
          '  ping <url>      Measure edge-to-target HTTP latency',
          '  clear           Clear terminal output buffer',
        ].join('\n'),
      },
      200,
      request
    );
  }

  if (cmd === 'pwd') {
    return jsonEdgeResponse({ exitCode: 0, stdout: '/edge-worker/supremeai-studio' }, 200, request);
  }

  if (cmd === 'whoami') {
    return jsonEdgeResponse(
      { exitCode: 0, stdout: 'supremeai-edge (runtime=cloudflare-pages-worker)' },
      200,
      request
    );
  }

  if (cmd === 'date') {
    return jsonEdgeResponse({ exitCode: 0, stdout: new Date().toUTCString() }, 200, request);
  }

  if (cmd === 'echo') {
    return jsonEdgeResponse({ exitCode: 0, stdout: args.join(' ') }, 200, request);
  }

  if (cmd === 'health' || cmd === 'status') {
    const started = Date.now();
    try {
      const probe = await fetchWithTimeout(`${upstreamOrigin}/health`, { method: 'GET' }, 4500);
      const latencyMs = Date.now() - started;
      return jsonEdgeResponse(
        {
          exitCode: 0,
          stdout: JSON.stringify(
            {
              status: probe.ok ? 'healthy' : 'degraded',
              app: 'SupremeAI Studio Edge',
              runtimeEnv: 'cloudflare-pages-edge',
              upstreamOrigin,
              upstreamStatus: probe.status,
              upstreamLatencyMs: latencyMs,
            },
            null,
            2
          ),
        },
        200,
        request
      );
    } catch (err: unknown) {
      return jsonEdgeResponse(
        {
          exitCode: 0,
          stdout: JSON.stringify(
            {
              status: 'degraded',
              app: 'SupremeAI Studio Edge',
              runtimeEnv: 'cloudflare-pages-edge',
              upstreamOrigin,
              error: err instanceof Error ? err.message : 'Upstream unreachable',
            },
            null,
            2
          ),
        },
        200,
        request
      );
    }
  }

  if (cmd === 'ping') {
    const rawTarget = args[0] || `${upstreamOrigin}/health`;
    if (!/^https?:\/\//i.test(rawTarget)) {
      return jsonEdgeResponse(
        { exitCode: 1, stderr: `ping: invalid HTTP URL "${rawTarget}"` },
        200,
        request
      );
    }
    const started = Date.now();
    try {
      const res = await fetchWithTimeout(rawTarget, { method: 'GET' }, 5000);
      const latencyMs = Date.now() - started;
      return jsonEdgeResponse(
        {
          exitCode: 0,
          stdout: `HTTP ${res.status} ${res.statusText} · ${latencyMs}ms · ${rawTarget}`,
        },
        200,
        request
      );
    } catch (err: unknown) {
      return jsonEdgeResponse(
        {
          exitCode: 1,
          stderr: err instanceof Error ? err.message : 'Edge ping failed',
        },
        200,
        request
      );
    }
  }

  return jsonEdgeResponse(
    {
      exitCode: 126,
      runtimeEnv: 'cloudflare-pages-edge',
      stderr: `Command "${rawCommand}" requires the local Node.js host server. Type "help" for Edge commands.`,
    },
    200,
    request
  );
}
