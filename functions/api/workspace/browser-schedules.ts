import {
  PagesContext,
  handleCorsPreflight,
  jsonEdgeResponse,
  resolveUpstreamOrigin,
  fetchWithTimeout,
} from '../../_lib/edgeHelpers';

interface StoredSchedule {
  id: string;
  title?: string;
  domain?: string;
  targetUrl?: string;
  enabled?: boolean;
  lastRunAt?: string | null;
  lastRunStatus?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

const edgeScheduleStore: StoredSchedule[] = [];

export async function onRequest(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return handleCorsPreflight(request);

  const incomingUrl = new URL(request.url);
  const upstreamOrigin = resolveUpstreamOrigin(env);
  const authHeader = request.headers.get('Authorization') || '';

  if (request.method === 'GET') {
    let schedules: StoredSchedule[] = [...edgeScheduleStore];
    if (authHeader) {
      try {
        const res = await fetchWithTimeout(
          `${upstreamOrigin}/api/v1/user/preferences`,
          { headers: { Authorization: authHeader, Accept: 'application/json' } },
          5000
        );
        if (res.ok) {
          const data = (await res.json().catch(() => null)) as any;
          const remote = data?.preferences?.browser_schedules;
          if (Array.isArray(remote) && remote.length > 0) {
            const byId = new Map<string, StoredSchedule>();
            for (const s of [...schedules, ...remote]) {
              if (s?.id) byId.set(String(s.id), s);
            }
            schedules = Array.from(byId.values());
          }
        }
      } catch {
        // Keep Edge schedule store cleanly
      }
    }
    return jsonEdgeResponse({ schedules }, 200, request);
  }

  const body = (await request.json().catch(() => ({}))) as Partial<StoredSchedule> & {
    action?: string;
  };
  const targetId = String(incomingUrl.searchParams.get('id') || body.id || '').trim();

  if (request.method === 'POST' && body.action === 'run' && targetId) {
    const idx = edgeScheduleStore.findIndex((s) => s.id === targetId);
    const target = idx >= 0 ? edgeScheduleStore[idx] : null;
    const targetUrl = String(body.targetUrl || target?.targetUrl || '').trim();
    const now = new Date().toISOString();
    let runStatus: 'ok' | 'error' = 'ok';
    let runSummary = 'Completed';
    if (targetUrl && /^https?:\/\//i.test(targetUrl)) {
      const started = Date.now();
      try {
        const probe = await fetchWithTimeout(targetUrl, { method: 'GET' }, 7000);
        runStatus = probe.ok ? 'ok' : 'error';
        runSummary = `HTTP ${probe.status} · ${Date.now() - started}ms`;
      } catch (err: unknown) {
        runStatus = 'error';
        runSummary = err instanceof Error ? err.message : 'Fetch failed';
      }
    }
    if (idx >= 0) {
      edgeScheduleStore[idx] = {
        ...edgeScheduleStore[idx],
        lastRunAt: now,
        lastRunStatus: runStatus,
        lastRunSummary: runSummary.slice(0, 240),
        updatedAt: now,
      };
    }
    return jsonEdgeResponse(
      {
        success: runStatus === 'ok',
        status: runStatus,
        summary: runSummary,
        schedule: idx >= 0 ? edgeScheduleStore[idx] : null,
        schedules: edgeScheduleStore,
      },
      200,
      request
    );
  }

  if (request.method === 'POST') {
    const id = String(body.id || `sched_${Date.now()}`);
    const created: StoredSchedule = {
      ...body,
      id,
      updatedAt: String(body.updatedAt || new Date().toISOString()),
    };
    const existingIdx = edgeScheduleStore.findIndex((s) => s.id === id);
    if (existingIdx >= 0) {
      edgeScheduleStore[existingIdx] = created;
    } else {
      edgeScheduleStore.unshift(created);
    }
  } else if (request.method === 'PATCH' && targetId) {
    const idx = edgeScheduleStore.findIndex((s) => s.id === targetId);
    if (idx >= 0) {
      edgeScheduleStore[idx] = {
        ...edgeScheduleStore[idx],
        ...body,
        id: targetId,
        updatedAt: new Date().toISOString(),
      };
    }
  } else if (request.method === 'DELETE' && targetId) {
    const idx = edgeScheduleStore.findIndex((s) => s.id === targetId);
    if (idx >= 0) {
      edgeScheduleStore.splice(idx, 1);
    }
  }

  if (authHeader) {
    await fetchWithTimeout(
      `${upstreamOrigin}/api/v1/user/preferences`,
      {
        method: 'POST',
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ browser_schedules: edgeScheduleStore }),
      },
      5000
    ).catch(() => {});
  }

  return jsonEdgeResponse({ success: true, schedules: edgeScheduleStore }, 200, request);
}
