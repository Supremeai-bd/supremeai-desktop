export const GIT_TOKENS_STORAGE_KEY = 'supremeai_git_tokens_v1';

export type GitProvider = 'github' | 'gitlab';

export interface GitTokenSettings {
  githubToken: string;
  gitlabToken: string;
  gitlabHost: string;
  defaultGithubRepo: string;
  defaultGitlabProject: string;
}

export interface GitExportFileItem {
  path: string;
  content: string;
}

export interface GitHubPushRequest {
  token: string;
  repo: string; // "owner/repo"
  branch: string; // target branch e.g. "main"
  files: GitExportFileItem[];
  commitMessage: string;
  createPullRequest?: boolean;
  prTitle?: string;
}

export interface GitLabPushRequest {
  token: string;
  project: string; // "namespace/project" or numeric ID
  host?: string; // defaults to "https://gitlab.com"
  branch: string;
  files: GitExportFileItem[];
  commitMessage: string;
  createMergeRequest?: boolean;
  mrTitle?: string;
}

export interface GitPushResult {
  provider: GitProvider;
  commitUrl: string;
  prUrl?: string;
  branch: string;
  filesCommitted: number;
}

const DEFAULT_GIT_TOKENS: GitTokenSettings = {
  githubToken: '',
  gitlabToken: '',
  gitlabHost: 'https://gitlab.com',
  defaultGithubRepo: '',
  defaultGitlabProject: '',
};

export function loadGitTokens(): GitTokenSettings {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_GIT_TOKENS };
  try {
    const raw = localStorage.getItem(GIT_TOKENS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_GIT_TOKENS };
    const parsed = JSON.parse(raw) as Partial<GitTokenSettings>;
    return {
      githubToken: typeof parsed.githubToken === 'string' ? parsed.githubToken : '',
      gitlabToken: typeof parsed.gitlabToken === 'string' ? parsed.gitlabToken : '',
      gitlabHost:
        typeof parsed.gitlabHost === 'string' && parsed.gitlabHost.trim()
          ? parsed.gitlabHost.trim().replace(/\/$/, '')
          : 'https://gitlab.com',
      defaultGithubRepo:
        typeof parsed.defaultGithubRepo === 'string' ? parsed.defaultGithubRepo : '',
      defaultGitlabProject:
        typeof parsed.defaultGitlabProject === 'string' ? parsed.defaultGitlabProject : '',
    };
  } catch {
    return { ...DEFAULT_GIT_TOKENS };
  }
}

export function saveGitTokens(partial: Partial<GitTokenSettings>): GitTokenSettings {
  const current = loadGitTokens();
  const next: GitTokenSettings = {
    ...current,
    ...partial,
    gitlabHost:
      (partial.gitlabHost ?? current.gitlabHost ?? 'https://gitlab.com')
        .trim()
        .replace(/\/$/, '') || 'https://gitlab.com',
  };
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(GIT_TOKENS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors
    }
  }
  return next;
}

export interface GitOAuthStatus {
  githubConfigured: boolean;
  gitlabConfigured: boolean;
  githubCallbackUrl: string;
  gitlabCallbackUrl: string;
}

export function isTrustedOAuthMessageOrigin(origin: string): boolean {
  if (!origin) return false;
  if (typeof window !== 'undefined' && window.location?.origin === origin) {
    return true;
  }
  return (
    origin.endsWith('.run.app') ||
    origin.endsWith('.pages.dev') ||
    origin.endsWith('.supremeai.bd') ||
    origin === 'https://supremeai.bd' ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1')
  );
}

export async function fetchGitOAuthStatus(): Promise<GitOAuthStatus> {
  const origin =
    typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
  const fallback: GitOAuthStatus = {
    githubConfigured: false,
    gitlabConfigured: false,
    githubCallbackUrl: `${origin}/api/git/oauth/github/callback`,
    gitlabCallbackUrl: `${origin}/api/git/oauth/gitlab/callback`,
  };
  if (typeof fetch === 'undefined') return fallback;
  try {
    const res = await fetch('/api/git/oauth/status');
    if (!res.ok) return fallback;
    const data = (await res.json()) as Partial<GitOAuthStatus>;
    return {
      githubConfigured: Boolean(data.githubConfigured),
      gitlabConfigured: Boolean(data.gitlabConfigured),
      githubCallbackUrl: data.githubCallbackUrl || fallback.githubCallbackUrl,
      gitlabCallbackUrl: data.gitlabCallbackUrl || fallback.gitlabCallbackUrl,
    };
  } catch {
    return fallback;
  }
}

export async function connectGitOAuthPopup(
  provider: GitProvider,
  gitlabHost?: string
): Promise<{ provider: GitProvider; token: string; host?: string }> {
  const query =
    provider === 'gitlab' && gitlabHost?.trim()
      ? `?host=${encodeURIComponent(gitlabHost.trim().replace(/\/+$/, ''))}`
      : '';
  const res = await fetch(`/api/git/oauth/${provider}/url${query}`);
  const data = (await res.json().catch(() => ({}))) as {
    configured?: boolean;
    url?: string;
    error?: string;
    callbackUrl?: string;
  };
  if (!res.ok || !data.url) {
    throw new Error(
      data.error ||
        `${provider === 'github' ? 'GitHub' : 'GitLab'} OAuth is not configured on this server. Use a Personal Access Token or configure OAuth callback ${data.callbackUrl || ''}.`
    );
  }

  const popup = window.open(data.url, `supremeai_${provider}_oauth`, 'width=600,height=700');
  if (!popup) {
    throw new Error('Please allow popups for this site to connect your account.');
  }

  return await new Promise<{ provider: GitProvider; token: string; host?: string }>(
    (resolve, reject) => {
      const timeout = window.setTimeout(
        () => {
          window.removeEventListener('message', handleMessage);
          reject(new Error('OAuth sign-in timed out. Please try again.'));
        },
        3 * 60 * 1000
      );

      const handleMessage = (event: MessageEvent) => {
        if (!isTrustedOAuthMessageOrigin(event.origin)) return;
        const msg = event.data as
          | {
              type?: string;
              provider?: GitProvider;
              token?: string;
              host?: string;
              error?: string;
            }
          | undefined;
        if (!msg) return;
        if (
          msg.type === 'SUPREMEAI_GIT_OAUTH_SUCCESS' &&
          msg.provider === provider &&
          typeof msg.token === 'string' &&
          msg.token.trim()
        ) {
          window.clearTimeout(timeout);
          window.removeEventListener('message', handleMessage);
          if (provider === 'github') {
            saveGitTokens({ githubToken: msg.token.trim() });
          } else {
            saveGitTokens({
              gitlabToken: msg.token.trim(),
              ...(msg.host ? { gitlabHost: msg.host } : {}),
            });
          }
          resolve({ provider, token: msg.token.trim(), host: msg.host });
        } else if (msg.type === 'SUPREMEAI_GIT_OAUTH_ERROR') {
          window.clearTimeout(timeout);
          window.removeEventListener('message', handleMessage);
          reject(new Error(msg.error || 'OAuth authorization failed.'));
        }
      };

      window.addEventListener('message', handleMessage);
    }
  );
}

export function suggestArtifactFilename(lang: string, _code?: string): string {
  const clean = (lang || 'html').toLowerCase().trim();
  switch (clean) {
    case 'tsx':
    case 'react':
      return 'src/App.tsx';
    case 'jsx':
      return 'src/App.jsx';
    case 'typescript':
    case 'ts':
      return 'src/index.ts';
    case 'javascript':
    case 'js':
      return 'src/index.js';
    case 'css':
    case 'scss':
      return 'src/styles.css';
    case 'mermaid':
      return 'docs/architecture.mmd';
    case 'json':
      return 'data/config.json';
    case 'markdown':
    case 'md':
      return 'README.md';
    case 'svg':
      return 'assets/graphic.svg';
    default:
      return 'index.html';
  }
}

export function buildProjectExportFiles(params: {
  code: string;
  lang: string;
  filePath?: string;
  standaloneHtml?: string;
}): GitExportFileItem[] {
  const primaryPath = (params.filePath || suggestArtifactFilename(params.lang, params.code))
    .trim()
    .replace(/^\/+/, '');
  const files: GitExportFileItem[] = [{ path: primaryPath, content: params.code }];

  if (params.standaloneHtml && primaryPath !== 'index.html') {
    files.push({
      path: 'preview.html',
      content: params.standaloneHtml,
    });
  }
  return files;
}

function encodeUtf8Base64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function normalizeGitHubRepo(rawRepo: string): { owner: string; repo: string } {
  const cleaned = rawRepo
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/^\/+|\/+$/g, '');
  const parts = cleaned.split('/').filter(Boolean);
  if (parts.length !== 2) {
    throw new Error('GitHub repository must be formatted as "owner/repo".');
  }
  return { owner: parts[0], repo: parts[1] };
}

function normalizeGitLabProject(rawProject: string): string {
  return rawProject
    .trim()
    .replace(/^https?:\/\/[^/]+\//i, '')
    .replace(/\.git$/i, '')
    .replace(/^\/+|\/+$/g, '');
}

async function parseGitError(res: Response, providerLabel: string): Promise<string> {
  try {
    const data = (await res.json()) as { message?: string; error?: string };
    if (data?.message) return `${providerLabel} (${res.status}): ${data.message}`;
    if (data?.error) return `${providerLabel} (${res.status}): ${data.error}`;
  } catch {
    // Fallback to status text
  }
  return `${providerLabel} request failed with HTTP ${res.status} ${res.statusText}`;
}

export async function pushToGitHub(req: GitHubPushRequest): Promise<GitPushResult> {
  const token = req.token.trim();
  if (!token) {
    throw new Error('A GitHub Personal Access Token (repo scope) is required.');
  }
  const { owner, repo } = normalizeGitHubRepo(req.repo);
  const baseBranch = req.branch.trim() || 'main';
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };

  let targetBranch = baseBranch;
  if (req.createPullRequest) {
    const refRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(baseBranch)}`,
      { headers }
    );
    if (!refRes.ok) {
      throw new Error(await parseGitError(refRes, 'GitHub'));
    }
    const refData = (await refRes.json()) as { object?: { sha?: string } };
    const baseSha = refData?.object?.sha;
    if (!baseSha) {
      throw new Error(`Could not resolve SHA for branch "${baseBranch}".`);
    }

    targetBranch = `supremeai/export-${Date.now().toString(36)}`;
    const createBranchRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ref: `refs/heads/${targetBranch}`,
        sha: baseSha,
      }),
    });
    if (!createBranchRes.ok) {
      throw new Error(await parseGitError(createBranchRes, 'GitHub'));
    }
  }

  let lastCommitUrl = `https://github.com/${owner}/${repo}/tree/${encodeURIComponent(targetBranch)}`;

  for (const file of req.files) {
    const cleanPath = file.path.replace(/^\/+/, '');
    const encodedPath = cleanPath.split('/').map(encodeURIComponent).join('/');
    const contentsUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`;

    let existingSha: string | undefined;
    const checkRes = await fetch(`${contentsUrl}?ref=${encodeURIComponent(targetBranch)}`, {
      headers,
    });
    if (checkRes.ok) {
      const existingData = (await checkRes.json()) as { sha?: string };
      existingSha = existingData?.sha;
    }

    const putRes = await fetch(contentsUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: req.commitMessage.trim() || `feat: export ${cleanPath} from SupremeAI Studio`,
        content: encodeUtf8Base64(file.content),
        branch: targetBranch,
        ...(existingSha ? { sha: existingSha } : {}),
      }),
    });
    if (!putRes.ok) {
      throw new Error(await parseGitError(putRes, 'GitHub'));
    }
    const putData = (await putRes.json()) as { commit?: { html_url?: string } };
    if (putData?.commit?.html_url) {
      lastCommitUrl = putData.commit.html_url;
    }
  }

  let prUrl: string | undefined;
  if (req.createPullRequest) {
    const prRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: req.prTitle?.trim() || req.commitMessage.trim() || 'Export from SupremeAI Studio',
        head: targetBranch,
        base: baseBranch,
        body: 'Exported directly from SupremeAI Studio Workspace.',
      }),
    });
    if (!prRes.ok) {
      throw new Error(await parseGitError(prRes, 'GitHub PR'));
    }
    const prData = (await prRes.json()) as { html_url?: string };
    prUrl = prData?.html_url;
  }

  return {
    provider: 'github',
    commitUrl: lastCommitUrl,
    prUrl,
    branch: targetBranch,
    filesCommitted: req.files.length,
  };
}

export async function pushToGitLab(req: GitLabPushRequest): Promise<GitPushResult> {
  const token = req.token.trim();
  if (!token) {
    throw new Error('A GitLab Personal Access Token (api scope) is required.');
  }
  const project = normalizeGitLabProject(req.project);
  if (!project) {
    throw new Error('GitLab project path (e.g. "group/project") is required.');
  }

  const host = (req.host || 'https://gitlab.com').trim().replace(/\/$/, '');
  const encodedProject = encodeURIComponent(project);
  const baseBranch = req.branch.trim() || 'main';
  const targetBranch = req.createMergeRequest
    ? `supremeai/export-${Date.now().toString(36)}`
    : baseBranch;

  const headers: Record<string, string> = {
    'PRIVATE-TOKEN': token,
    'Content-Type': 'application/json',
  };

  // Detect create vs update per file on baseBranch
  const refToCheck = req.createMergeRequest ? baseBranch : targetBranch;
  const actions = await Promise.all(
    req.files.map(async (file) => {
      const cleanPath = file.path.replace(/^\/+/, '');
      let action: 'create' | 'update' = 'create';
      try {
        const checkRes = await fetch(
          `${host}/api/v4/projects/${encodedProject}/repository/files/${encodeURIComponent(cleanPath)}?ref=${encodeURIComponent(refToCheck)}`,
          { headers }
        );
        if (checkRes.ok) {
          action = 'update';
        }
      } catch {
        action = 'create';
      }
      return {
        action,
        file_path: cleanPath,
        content: file.content,
      };
    })
  );

  const commitBody: Record<string, unknown> = {
    branch: targetBranch,
    commit_message: req.commitMessage.trim() || 'feat: export from SupremeAI Studio',
    actions,
  };
  if (req.createMergeRequest) {
    commitBody.start_branch = baseBranch;
  }

  const commitRes = await fetch(`${host}/api/v4/projects/${encodedProject}/repository/commits`, {
    method: 'POST',
    headers,
    body: JSON.stringify(commitBody),
  });
  if (!commitRes.ok) {
    throw new Error(await parseGitError(commitRes, 'GitLab'));
  }

  const commitData = (await commitRes.json()) as { web_url?: string };
  const commitUrl =
    commitData?.web_url || `${host}/${project}/-/tree/${encodeURIComponent(targetBranch)}`;

  let prUrl: string | undefined;
  if (req.createMergeRequest) {
    const mrRes = await fetch(`${host}/api/v4/projects/${encodedProject}/merge_requests`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        source_branch: targetBranch,
        target_branch: baseBranch,
        title: req.mrTitle?.trim() || req.commitMessage.trim() || 'Export from SupremeAI Studio',
        description: 'Exported directly from SupremeAI Studio Workspace.',
      }),
    });
    if (!mrRes.ok) {
      throw new Error(await parseGitError(mrRes, 'GitLab MR'));
    }
    const mrData = (await mrRes.json()) as { web_url?: string };
    prUrl = mrData?.web_url;
  }

  return {
    provider: 'gitlab',
    commitUrl,
    prUrl,
    branch: targetBranch,
    filesCommitted: req.files.length,
  };
}
