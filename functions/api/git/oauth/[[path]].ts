import {
  PagesContext,
  handleCorsPreflight,
  jsonEdgeResponse,
  fetchWithTimeout,
} from '../../../_lib/edgeHelpers';

function buildPopupHtml(payload: Record<string, unknown>): Response {
  const safeJson = JSON.stringify(payload).replace(/</g, '\\u003c');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>SupremeAI Git OAuth</title></head><body style="background:#090d16;color:#e2e8f0;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;"><div style="text-align:center;max-width:380px;padding:24px;"><p>Completing authorization...</p></div><script>try{if(window.opener){window.opener.postMessage(${safeJson}, '*');}}catch(e){}setTimeout(function(){window.close();},350);</script></body></html>`;
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function onRequest(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return handleCorsPreflight(request);

  const incomingUrl = new URL(request.url);
  const path = incomingUrl.pathname;
  const origin = incomingUrl.origin;

  const githubClientId = env?.GITHUB_OAUTH_CLIENT_ID?.trim() || '';
  const githubClientSecret = env?.GITHUB_OAUTH_CLIENT_SECRET?.trim() || '';
  const gitlabClientId = env?.GITLAB_OAUTH_CLIENT_ID?.trim() || '';
  const gitlabClientSecret = env?.GITLAB_OAUTH_CLIENT_SECRET?.trim() || '';

  const githubCallbackUrl = `${origin}/api/git/oauth/github/callback`;
  const gitlabCallbackUrl = `${origin}/api/git/oauth/gitlab/callback`;

  if (path === '/api/git/oauth/status') {
    return jsonEdgeResponse(
      {
        githubConfigured: Boolean(githubClientId && githubClientSecret),
        gitlabConfigured: Boolean(gitlabClientId && gitlabClientSecret),
        githubCallbackUrl,
        gitlabCallbackUrl,
      },
      200,
      request
    );
  }

  if (path === '/api/git/oauth/github/url') {
    if (!githubClientId || !githubClientSecret) {
      return jsonEdgeResponse(
        {
          configured: false,
          callbackUrl: githubCallbackUrl,
          error:
            'GitHub OAuth credentials are not configured on Cloudflare Pages env. Use a GitHub Personal Access Token directly.',
        },
        400,
        request
      );
    }
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(
      githubClientId
    )}&redirect_uri=${encodeURIComponent(githubCallbackUrl)}&scope=repo`;
    return jsonEdgeResponse(
      { configured: true, url: authUrl, callbackUrl: githubCallbackUrl },
      200,
      request
    );
  }

  if (path === '/api/git/oauth/gitlab/url') {
    const host = (incomingUrl.searchParams.get('host') || 'https://gitlab.com').replace(/\/+$/, '');
    if (!gitlabClientId || !gitlabClientSecret) {
      return jsonEdgeResponse(
        {
          configured: false,
          callbackUrl: gitlabCallbackUrl,
          error:
            'GitLab OAuth credentials are not configured on Cloudflare Pages env. Use a GitLab Personal Access Token directly.',
        },
        400,
        request
      );
    }
    const authUrl = `${host}/oauth/authorize?client_id=${encodeURIComponent(
      gitlabClientId
    )}&redirect_uri=${encodeURIComponent(gitlabCallbackUrl)}&response_type=code&scope=api`;
    return jsonEdgeResponse(
      { configured: true, url: authUrl, callbackUrl: gitlabCallbackUrl },
      200,
      request
    );
  }

  if (path.startsWith('/api/git/oauth/github/callback')) {
    const code = incomingUrl.searchParams.get('code') || '';
    if (!code || !githubClientId || !githubClientSecret) {
      return buildPopupHtml({
        type: 'SUPREMEAI_GIT_OAUTH_ERROR',
        provider: 'github',
        error: 'Missing OAuth code or server credentials.',
      });
    }
    try {
      const tokenRes = await fetchWithTimeout('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: githubClientId,
          client_secret: githubClientSecret,
          code,
          redirect_uri: githubCallbackUrl,
        }),
      });
      const tokenJson = (await tokenRes.json().catch(() => null)) as any;
      if (tokenJson?.access_token) {
        return buildPopupHtml({
          type: 'SUPREMEAI_GIT_OAUTH_SUCCESS',
          provider: 'github',
          token: tokenJson.access_token,
        });
      }
      return buildPopupHtml({
        type: 'SUPREMEAI_GIT_OAUTH_ERROR',
        provider: 'github',
        error: tokenJson?.error_description || 'Token exchange failed.',
      });
    } catch {
      return buildPopupHtml({
        type: 'SUPREMEAI_GIT_OAUTH_ERROR',
        provider: 'github',
        error: 'GitHub OAuth exchange timed out.',
      });
    }
  }

  if (path.startsWith('/api/git/oauth/gitlab/callback')) {
    const code = incomingUrl.searchParams.get('code') || '';
    const host = (incomingUrl.searchParams.get('host') || 'https://gitlab.com').replace(/\/+$/, '');
    if (!code || !gitlabClientId || !gitlabClientSecret) {
      return buildPopupHtml({
        type: 'SUPREMEAI_GIT_OAUTH_ERROR',
        provider: 'gitlab',
        error: 'Missing OAuth code or server credentials.',
      });
    }
    try {
      const tokenRes = await fetchWithTimeout(`${host}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          client_id: gitlabClientId,
          client_secret: gitlabClientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: gitlabCallbackUrl,
        }),
      });
      const tokenJson = (await tokenRes.json().catch(() => null)) as any;
      if (tokenJson?.access_token) {
        return buildPopupHtml({
          type: 'SUPREMEAI_GIT_OAUTH_SUCCESS',
          provider: 'gitlab',
          token: tokenJson.access_token,
          host,
        });
      }
      return buildPopupHtml({
        type: 'SUPREMEAI_GIT_OAUTH_ERROR',
        provider: 'gitlab',
        error: tokenJson?.error_description || 'GitLab token exchange failed.',
      });
    } catch {
      return buildPopupHtml({
        type: 'SUPREMEAI_GIT_OAUTH_ERROR',
        provider: 'gitlab',
        error: 'GitLab OAuth exchange timed out.',
      });
    }
  }

  return jsonEdgeResponse({ error: 'Unknown Git OAuth route' }, 404, request);
}
