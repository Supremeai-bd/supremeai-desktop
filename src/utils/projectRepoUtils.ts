import type { ProjectBuildStatus, UserProject } from '../types';

export interface ParsedGitHubRepo {
  owner: string;
  repo: string;
  slug: string;
  normalizedUrl: string;
}

export interface WorkflowRunSnapshot {
  status?: string | null;
  conclusion?: string | null;
  html_url?: string | null;
}

/**
 * Extracts GitHub owner/repo slug from HTTPS or SSH GitHub URLs.
 */
export function parseGitHubRepoSlug(repoUrl: string): ParsedGitHubRepo | null {
  const trimmed = String(repoUrl || '').trim();
  if (!trimmed) return null;

  // Handle SSH URLs like git@github.com:owner/repo.git
  const sshMatch = trimmed.match(
    /^git@github\.com:([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/i
  );
  if (sshMatch) {
    const owner = sshMatch[1];
    const repo = sshMatch[2];
    return {
      owner,
      repo,
      slug: `${owner}/${repo}`,
      normalizedUrl: `https://github.com/${owner}/${repo}`,
    };
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    if (host !== 'github.com' && host !== 'www.github.com') {
      return null;
    }
    const segments = parsed.pathname
      .split('/')
      .map((s) => s.trim())
      .filter(Boolean);
    if (segments.length < 2) return null;
    const owner = segments[0];
    const repo = segments[1].replace(/\.git$/i, '');
    if (!owner || !repo) return null;
    return {
      owner,
      repo,
      slug: `${owner}/${repo}`,
      normalizedUrl: `https://github.com/${owner}/${repo}`,
    };
  } catch {
    return null;
  }
}

/**
 * Sanitizes external repository URLs so only http/https links are rendered.
 */
export function sanitizeExternalRepoUrl(rawUrl: string): string | null {
  const parsedGh = parseGitHubRepoSlug(rawUrl);
  if (parsedGh) return parsedGh.normalizedUrl;

  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Returns the GitHub URL for opening the repository (optionally on a branch).
 */
export function buildGitHubOpenUrl(repoUrl: string, branch?: string): string {
  const parsedGh = parseGitHubRepoSlug(repoUrl);
  if (parsedGh) {
    const cleanBranch = String(branch || '').trim();
    if (cleanBranch && cleanBranch !== 'main' && cleanBranch !== 'master') {
      return `${parsedGh.normalizedUrl}/tree/${encodeURIComponent(cleanBranch)}`;
    }
    return parsedGh.normalizedUrl;
  }
  return sanitizeExternalRepoUrl(repoUrl) || 'https://github.com';
}

/**
 * Returns the direct GitHub web fork URL for a connected repository.
 */
export function buildGitHubForkUrl(repoUrl: string): string | null {
  const parsedGh = parseGitHubRepoSlug(repoUrl);
  return parsedGh ? `${parsedGh.normalizedUrl}/fork` : null;
}

/**
 * Maps a GitHub Actions workflow run status & conclusion to an at-a-glance build status.
 */
export function mapWorkflowRunToBuildStatus(run?: WorkflowRunSnapshot | null): ProjectBuildStatus {
  if (!run) return 'unknown';
  const status = String(run.status || '').toLowerCase();
  const conclusion = String(run.conclusion || '').toLowerCase();

  if (
    status === 'in_progress' ||
    status === 'queued' ||
    status === 'waiting' ||
    status === 'pending' ||
    status === 'requested'
  ) {
    return 'building';
  }

  if (status === 'completed') {
    if (conclusion === 'success') return 'passing';
    if (
      conclusion === 'failure' ||
      conclusion === 'timed_out' ||
      conclusion === 'startup_failure' ||
      conclusion === 'action_required'
    ) {
      return 'failing';
    }
    return 'unknown';
  }

  return 'unknown';
}

/**
 * Builds a clean forked UserProject payload for studio-local or GitHub forks.
 */
export function createForkedProjectPayload(
  source: UserProject,
  forkOwnerHandle?: string
): Omit<UserProject, 'id' | 'lastSynced' | 'stars' | 'aiReviewStatus'> & {
  forkedFrom: string;
  buildStatus: ProjectBuildStatus;
} {
  const parsed = parseGitHubRepoSlug(source.repoUrl);
  const cleanHandle = String(forkOwnerHandle || '')
    .trim()
    .replace(/[^a-zA-Z0-9-]/g, '');

  const forkName = source.name.endsWith('-fork') ? `${source.name}-2` : `${source.name}-fork`;
  const forkRepoUrl = parsed
    ? cleanHandle && cleanHandle.toLowerCase() !== parsed.owner.toLowerCase()
      ? `https://github.com/${cleanHandle}/${parsed.repo}`
      : `https://github.com/${parsed.owner}/${parsed.repo}-fork`
    : source.repoUrl;

  return {
    name: forkName,
    repoUrl: forkRepoUrl,
    branch: source.branch || 'main',
    description: source.description,
    language: source.language,
    buildStatus: source.buildStatus || 'passing',
    ...(forkRepoUrl === source.repoUrl && source.buildUrl ? { buildUrl: source.buildUrl } : {}),
    forkedFrom: parsed ? parsed.slug : source.name,
  };
}
