import { apiClient } from './apiClient';
import { env } from '../config/env';
import { ProjectBuildStatus, UserProject } from '../types';
import { INITIAL_USER_PROJECTS } from '../data/userPlugins';
import {
  buildGitHubForkUrl,
  createForkedProjectPayload,
  parseGitHubRepoSlug,
} from '../utils/projectRepoUtils';

interface CreateProjectResponse {
  project?: UserProject;
  id?: string;
}

interface BuildStatusResponse {
  buildStatus?: ProjectBuildStatus;
  buildUrl?: string;
  checkedAt?: number;
}

export interface ForkProjectResult {
  project: UserProject;
  remoteForked: boolean;
  githubForkUrl: string | null;
}

interface ForkProjectApiResponse {
  project?: UserProject;
  remoteForked?: boolean;
  githubForkUrl?: string | null;
}

export const projectService = {
  async fetchProjects(): Promise<UserProject[]> {
    if (env.isMockEnabled) {
      return INITIAL_USER_PROJECTS;
    }
    try {
      const res = await apiClient.get<{ projects?: UserProject[] }>('/api/v1/projects');
      if (res && Array.isArray(res.projects)) {
        return res.projects;
      }
      return [];
    } catch {
      return [];
    }
  },

  async createProject(
    project: Omit<UserProject, 'id' | 'lastSynced' | 'stars' | 'aiReviewStatus'>
  ): Promise<UserProject> {
    const parsedGh = parseGitHubRepoSlug(project.repoUrl);
    const fallbackItem: UserProject = {
      ...project,
      id: `proj_${Date.now()}`,
      lastSynced: Date.now(),
      stars: 0,
      aiReviewStatus: 'idle',
      buildStatus: project.buildStatus || 'unknown',
      ...(parsedGh ? { buildUrl: `${parsedGh.normalizedUrl}/actions` } : {}),
    };
    if (env.isMockEnabled) {
      return fallbackItem;
    }
    const res = await apiClient.post<CreateProjectResponse>('/api/v1/projects', {
      name: project.name,
      description: project.description,
      repoUrl: project.repoUrl,
      branch: project.branch,
      language: project.language,
      ...(project.buildStatus ? { buildStatus: project.buildStatus } : {}),
      ...(project.buildUrl ? { buildUrl: project.buildUrl } : {}),
      ...(project.forkedFrom ? { forkedFrom: project.forkedFrom } : {}),
    });
    const created = res?.project || (res as unknown as Partial<UserProject>);
    return {
      ...fallbackItem,
      ...created,
      id: created?.id || fallbackItem.id,
    };
  },

  async fetchBuildStatus(
    repoUrl: string,
    branch: string,
    githubToken?: string,
    projectId?: string
  ): Promise<{ buildStatus: ProjectBuildStatus; buildUrl?: string; checkedAt: number }> {
    const parsedGh = parseGitHubRepoSlug(repoUrl);
    const defaultBuildUrl = parsedGh ? `${parsedGh.normalizedUrl}/actions` : undefined;
    if (env.isMockEnabled) {
      return {
        buildStatus: 'passing',
        buildUrl: defaultBuildUrl,
        checkedAt: Date.now(),
      };
    }
    try {
      const params: Record<string, string> = {
        repoUrl,
        branch: branch || 'main',
      };
      if (projectId) params.projectId = projectId;
      const query = new URLSearchParams(params).toString();
      const headers: Record<string, string> = {};
      if (githubToken && githubToken.trim()) {
        headers['x-github-token'] = githubToken.trim();
      }
      const res = await apiClient.get<BuildStatusResponse>(
        `/api/v1/projects/github-status?${query}`,
        { headers, timeoutMs: 6000 }
      );
      const status = res?.buildStatus;
      const normalizedStatus: ProjectBuildStatus =
        status === 'passing' || status === 'failing' || status === 'building' ? status : 'unknown';
      return {
        buildStatus: normalizedStatus,
        buildUrl: res?.buildUrl || defaultBuildUrl,
        checkedAt: typeof res?.checkedAt === 'number' ? res.checkedAt : Date.now(),
      };
    } catch {
      return {
        buildStatus: 'unknown',
        buildUrl: defaultBuildUrl,
        checkedAt: Date.now(),
      };
    }
  },

  async forkProject(source: UserProject, githubToken?: string): Promise<ForkProjectResult> {
    const fallbackPayload = createForkedProjectPayload(source);
    const githubForkUrl = buildGitHubForkUrl(source.repoUrl);
    const fallbackProject: UserProject = {
      ...fallbackPayload,
      id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      lastSynced: Date.now(),
      stars: 0,
      aiReviewStatus: 'idle',
    };

    if (env.isMockEnabled) {
      return {
        project: fallbackProject,
        remoteForked: false,
        githubForkUrl,
      };
    }

    try {
      const headers: Record<string, string> = {};
      if (githubToken && githubToken.trim()) {
        headers['x-github-token'] = githubToken.trim();
      }
      const res = await apiClient.post<ForkProjectApiResponse>(
        '/api/v1/projects/fork',
        {
          sourceId: source.id,
          name: source.name,
          description: source.description,
          repoUrl: source.repoUrl,
          branch: source.branch,
          language: source.language,
          buildStatus: source.buildStatus,
        },
        { headers, timeoutMs: 8000 }
      );
      return {
        project: res?.project ? { ...fallbackProject, ...res.project } : fallbackProject,
        remoteForked: Boolean(res?.remoteForked),
        githubForkUrl: res?.githubForkUrl ?? githubForkUrl,
      };
    } catch {
      return {
        project: fallbackProject,
        remoteForked: false,
        githubForkUrl,
      };
    }
  },

  async deleteProject(id: string): Promise<boolean> {
    if (env.isMockEnabled) {
      return true;
    }
    try {
      await apiClient.delete(`/api/v1/projects/${encodeURIComponent(id)}`);
      return true;
    } catch {
      return false;
    }
  },
};
