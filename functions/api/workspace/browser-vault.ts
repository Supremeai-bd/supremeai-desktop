import {
  PagesContext,
  handleCorsPreflight,
  jsonEdgeResponse,
  resolveUpstreamOrigin,
  fetchWithTimeout,
} from '../../_lib/edgeHelpers';

interface StoredVaultEntry {
  id: string;
  domain: string;
  mode: string;
  label?: string;
  usernameHint?: string;
  cookieCount?: number;
  encryptedPayload?: string;
  iv?: string;
  algorithm?: string;
  updatedAt?: string;
  createdAt?: string;
  [key: string]: unknown;
}

const edgeVaultStore: StoredVaultEntry[] = [];

function redactVaultEntry(
  entry: StoredVaultEntry,
  includeEncrypted: boolean
): Record<string, unknown> {
  const hasEncryptedSecret = Boolean(entry.encryptedPayload && entry.iv);
  if (includeEncrypted) {
    return { ...entry, hasEncryptedSecret };
  }
  const { encryptedPayload: _ep, iv: _iv, ...safe } = entry;
  return { ...safe, hasEncryptedSecret };
}

export async function onRequest(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return handleCorsPreflight(request);

  const incomingUrl = new URL(request.url);
  const upstreamOrigin = resolveUpstreamOrigin(env);
  const authHeader = request.headers.get('Authorization') || '';
  const includeEncrypted = incomingUrl.searchParams.get('includeEncrypted') === '1';
  const domainFilter = (incomingUrl.searchParams.get('domain') || '').trim().toLowerCase();

  if (request.method === 'GET') {
    let entries: StoredVaultEntry[] = [...edgeVaultStore];

    if (authHeader) {
      try {
        const res = await fetchWithTimeout(
          `${upstreamOrigin}/api/v1/user/preferences`,
          { headers: { Authorization: authHeader, Accept: 'application/json' } },
          5000
        );
        if (res.ok) {
          const data = (await res.json().catch(() => null)) as any;
          const remoteEntries = data?.preferences?.browser_vault_entries;
          if (Array.isArray(remoteEntries) && remoteEntries.length > 0) {
            const byId = new Map<string, StoredVaultEntry>();
            for (const e of [...entries, ...remoteEntries]) {
              if (e?.id) byId.set(String(e.id), e);
            }
            entries = Array.from(byId.values());
          }
        }
      } catch {
        // Keep Edge store entries cleanly
      }
    }

    const filtered = domainFilter
      ? entries.filter((e) =>
          String(e.domain || '')
            .toLowerCase()
            .includes(domainFilter)
        )
      : entries;

    return jsonEdgeResponse(
      {
        entries: filtered.map((e) => redactVaultEntry(e, includeEncrypted)),
      },
      200,
      request
    );
  }

  if (request.method === 'POST') {
    const body = (await request.json().catch(() => ({}))) as Partial<StoredVaultEntry>;
    const id = String(body.id || `vault_${Date.now()}`);
    const entry: StoredVaultEntry = {
      ...body,
      id,
      domain: String(body.domain || '').toLowerCase(),
      mode: String(body.mode || 'session'),
      updatedAt: String(body.updatedAt || new Date().toISOString()),
    };

    const existingIdx = edgeVaultStore.findIndex((e) => e.id === id);
    if (existingIdx >= 0) {
      edgeVaultStore[existingIdx] = entry;
    } else {
      edgeVaultStore.unshift(entry);
    }

    if (authHeader) {
      await fetchWithTimeout(
        `${upstreamOrigin}/api/v1/user/preferences`,
        {
          method: 'POST',
          headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({ browser_vault_entries: edgeVaultStore }),
        },
        5000
      ).catch(() => {});
    }

    return jsonEdgeResponse(
      {
        success: true,
        entry: redactVaultEntry(entry, includeEncrypted),
        entries: edgeVaultStore.map((e) => redactVaultEntry(e, includeEncrypted)),
      },
      200,
      request
    );
  }

  if (request.method === 'DELETE') {
    const body = (await request.json().catch(() => ({}))) as { id?: string };
    const targetId = String(incomingUrl.searchParams.get('id') || body.id || '').trim();
    if (targetId) {
      const idx = edgeVaultStore.findIndex((e) => e.id === targetId);
      if (idx >= 0) edgeVaultStore.splice(idx, 1);
    }

    if (authHeader) {
      await fetchWithTimeout(
        `${upstreamOrigin}/api/v1/user/preferences`,
        {
          method: 'POST',
          headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({ browser_vault_entries: edgeVaultStore }),
        },
        5000
      ).catch(() => {});
    }

    return jsonEdgeResponse({ success: true, deletedId: targetId }, 200, request);
  }

  return jsonEdgeResponse({ error: 'Method not allowed' }, 405, request);
}
