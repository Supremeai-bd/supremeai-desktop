import {
  PagesContext,
  handleCorsPreflight,
  jsonEdgeResponse,
  resolveUpstreamOrigin,
  fetchWithTimeout,
  generateEdgeBase32Secret,
  verifyEdgeTotpToken,
} from '../../../_lib/edgeHelpers';

const TOTP_ISSUER = 'SupremeAI Studio';

async function loadTotpSecretFromPrefs(
  upstreamOrigin: string,
  authHeader: string
): Promise<{ secret: string; enrolled: boolean } | null> {
  if (!authHeader) return null;
  try {
    const res = await fetchWithTimeout(
      `${upstreamOrigin}/api/v1/user/preferences`,
      {
        headers: { Authorization: authHeader, Accept: 'application/json' },
      },
      5000
    );
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as any;
    const prefs = data?.preferences || data;
    const totp = prefs?.security_totp;
    if (totp && typeof totp.secret === 'string' && totp.secret.trim()) {
      return {
        secret: totp.secret.trim(),
        enrolled: Boolean(totp.enrolled),
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function saveTotpToPrefs(
  upstreamOrigin: string,
  authHeader: string,
  secret: string,
  enrolled: boolean
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
      body: JSON.stringify({
        security_totp: {
          secret,
          enrolled,
          updatedAt: new Date().toISOString(),
        },
      }),
    },
    5000
  ).catch(() => {});
}

export async function onRequest(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return handleCorsPreflight(request);

  const incomingUrl = new URL(request.url);
  const subPath = incomingUrl.pathname.replace(/^\/api\/auth\/totp\/?/, '').trim();
  const upstreamOrigin = resolveUpstreamOrigin(env);
  const authHeader = request.headers.get('Authorization') || '';
  const envSecret = env?.ADMIN_TOTP_SECRET?.trim() || '';

  if (subPath === 'status' && request.method === 'GET') {
    const userEmail =
      (incomingUrl.searchParams.get('userEmail') || '').trim().toLowerCase() ||
      'operator@supremeai.bd';
    const vaultEntry = await loadTotpSecretFromPrefs(upstreamOrigin, authHeader);
    const enrolled = Boolean(envSecret || vaultEntry?.enrolled);
    const source = envSecret ? 'env' : vaultEntry?.enrolled ? 'user_vault' : 'none';
    return jsonEdgeResponse(
      {
        enrolled,
        source,
        issuer: TOTP_ISSUER,
        accountName: userEmail,
      },
      200,
      request
    );
  }

  if (subPath === 'setup' && request.method === 'POST') {
    const body = (await request.json().catch(() => ({}))) as {
      userEmail?: string;
    };
    const userEmail = (body.userEmail || 'operator@supremeai.bd').trim().toLowerCase();
    const secret = generateEdgeBase32Secret(20);
    await saveTotpToPrefs(upstreamOrigin, authHeader, secret, false);

    // Also notify Render admin totp-setup if available (non-blocking)
    fetchWithTimeout(
      `${upstreamOrigin}/api/admin/totp-setup`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify({ userEmail }),
      },
      3500
    ).catch(() => {});

    const label = encodeURIComponent(`${TOTP_ISSUER}:${userEmail}`);
    const otpauthUrl = `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(
      TOTP_ISSUER
    )}&algorithm=SHA1&digits=6&period=30`;

    return jsonEdgeResponse(
      {
        success: true,
        secret,
        otpauthUrl,
        qrDataUrl: '',
        issuer: TOTP_ISSUER,
        accountName: userEmail,
      },
      200,
      request
    );
  }

  if (subPath === 'confirm' && request.method === 'POST') {
    const body = (await request.json().catch(() => ({}))) as {
      userEmail?: string;
      token?: string;
      trustFor7Days?: boolean;
    };
    const code = String(body.token || '').trim();
    const vaultEntry = await loadTotpSecretFromPrefs(upstreamOrigin, authHeader);
    const activeSecret = envSecret || vaultEntry?.secret || '';

    if (!activeSecret) {
      return jsonEdgeResponse(
        { error: 'No pending TOTP setup secret found. Please initiate setup first.' },
        400,
        request
      );
    }

    const valid = await verifyEdgeTotpToken(activeSecret, code, 1);
    if (!valid) {
      return jsonEdgeResponse(
        { error: 'Invalid 6-digit Authenticator verification code.' },
        401,
        request
      );
    }

    if (vaultEntry?.secret) {
      await saveTotpToPrefs(upstreamOrigin, authHeader, vaultEntry.secret, true);
    }

    const trustUntil = body.trustFor7Days ? Date.now() + 7 * 24 * 60 * 60 * 1000 : null;
    return jsonEdgeResponse(
      {
        success: true,
        verified: true,
        authMethod: 'totp',
        trustedBrowser: Boolean(body.trustFor7Days),
        trustedUntil: trustUntil,
        deviceId: `cf_dev_${Date.now().toString(36)}`,
        message: 'Two-factor authentication verified and enabled.',
      },
      200,
      request
    );
  }

  return jsonEdgeResponse({ error: 'Unknown TOTP endpoint' }, 404, request);
}
