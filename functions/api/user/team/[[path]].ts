import {
  PagesContext,
  handleCorsPreflight,
  jsonEdgeResponse,
  resolveUpstreamOrigin,
  fetchWithTimeout,
} from '../../../_lib/edgeHelpers';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'Owner' | 'Admin' | 'Developer' | 'Viewer';
  joinedDate: string;
  twoFactorEnabled: boolean;
  status: 'active' | 'invited';
}

const MAX_SEATS = 10;

async function readRemoteTeamMembers(
  upstreamOrigin: string,
  authHeader: string
): Promise<TeamMember[] | null> {
  if (!authHeader) return null;
  try {
    const res = await fetchWithTimeout(
      `${upstreamOrigin}/api/v1/user/preferences`,
      {
        method: 'GET',
        headers: {
          Authorization: authHeader,
          Accept: 'application/json',
        },
      },
      5500
    );
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as any;
    const prefs = data?.preferences || data;
    if (Array.isArray(prefs?.team_members)) {
      return prefs.team_members as TeamMember[];
    }
    return [];
  } catch {
    return null;
  }
}

async function saveRemoteTeamMembers(
  upstreamOrigin: string,
  authHeader: string,
  members: TeamMember[]
): Promise<void> {
  if (!authHeader) return;
  await fetchWithTimeout(
    `${upstreamOrigin}/api/v1/user/preferences`,
    {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ team_members: members }),
    },
    5500
  ).catch(() => {});
}

export async function onRequest(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return handleCorsPreflight(request);

  const incomingUrl = new URL(request.url);
  const upstreamOrigin = resolveUpstreamOrigin(env);
  const authHeader = request.headers.get('Authorization') || '';
  const suffix = incomingUrl.pathname.replace(/^\/api\/user\/team\/?/, '').trim();
  const memberId = suffix ? decodeURIComponent(suffix) : '';

  const currentMembers = (await readRemoteTeamMembers(upstreamOrigin, authHeader)) ?? [];

  if (request.method === 'GET') {
    return jsonEdgeResponse(
      {
        members: currentMembers,
        maxSeats: MAX_SEATS,
        tier: 'Pro',
        source: authHeader ? 'edge-user-prefs' : 'edge-guest',
      },
      200,
      request
    );
  }

  if (request.method === 'POST' && !memberId) {
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      role?: TeamMember['role'];
    };
    const email = String(body.email || '')
      .trim()
      .toLowerCase();
    if (!email || !email.includes('@')) {
      return jsonEdgeResponse({ error: 'Valid email address is required.' }, 400, request);
    }
    const role: TeamMember['role'] =
      body.role === 'Owner' ||
      body.role === 'Admin' ||
      body.role === 'Developer' ||
      body.role === 'Viewer'
        ? body.role
        : 'Developer';
    const namePart = email.split('@')[0] || 'Member';
    const displayName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    const created: TeamMember = {
      id: `mem_${Date.now()}`,
      name: displayName,
      email,
      avatar: displayName.charAt(0).toUpperCase(),
      role,
      joinedDate: 'Just invited',
      twoFactorEnabled: false,
      status: 'invited',
    };
    const updated = [created, ...currentMembers.filter((m) => m.email.toLowerCase() !== email)];
    await saveRemoteTeamMembers(upstreamOrigin, authHeader, updated);
    return jsonEdgeResponse(
      { member: created, members: updated, maxSeats: MAX_SEATS },
      200,
      request
    );
  }

  if (request.method === 'PATCH' && memberId) {
    const body = (await request.json().catch(() => ({}))) as { role?: TeamMember['role'] };
    const nextRole = body.role;
    const updated = currentMembers.map((m) =>
      m.id === memberId && nextRole ? { ...m, role: nextRole } : m
    );
    await saveRemoteTeamMembers(upstreamOrigin, authHeader, updated);
    return jsonEdgeResponse({ members: updated, maxSeats: MAX_SEATS }, 200, request);
  }

  if (request.method === 'DELETE' && memberId) {
    const updated = currentMembers.filter((m) => m.id !== memberId);
    await saveRemoteTeamMembers(upstreamOrigin, authHeader, updated);
    return jsonEdgeResponse({ members: updated, maxSeats: MAX_SEATS }, 200, request);
  }

  return jsonEdgeResponse({ error: 'Method or route not allowed' }, 405, request);
}
