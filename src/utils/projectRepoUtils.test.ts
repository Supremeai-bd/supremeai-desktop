import { describe, it, expect } from 'vitest';
import {
  parseGitHubRepoSlug,
  sanitizeExternalRepoUrl,
  buildGitHubOpenUrl,
  buildGitHubForkUrl,
  mapWorkflowRunToBuildStatus,
  createForkedProjectPayload,
} from './projectRepoUtils';
import type { UserProject } from '../types';

describe('projectRepoUtils', () => {
  it('parses HTTPS and SSH GitHub URLs into owner/repo slugs', () => {
    expect(parseGitHubRepoSlug('https://github.com/Supremeai-bd/supremeai')).toEqual({
      owner: 'Supremeai-bd',
      repo: 'supremeai',
      slug: 'Supremeai-bd/supremeai',
      normalizedUrl: 'https://github.com/Supremeai-bd/supremeai',
    });

    expect(parseGitHubRepoSlug('https://github.com/Supremeai-bd/supremeai.git')).toEqual({
      owner: 'Supremeai-bd',
      repo: 'supremeai',
      slug: 'Supremeai-bd/supremeai',
      normalizedUrl: 'https://github.com/Supremeai-bd/supremeai',
    });

    expect(parseGitHubRepoSlug('git@github.com:Supremeai-bd/supremeai-frontend.git')).toEqual({
      owner: 'Supremeai-bd',
      repo: 'supremeai-frontend',
      slug: 'Supremeai-bd/supremeai-frontend',
      normalizedUrl: 'https://github.com/Supremeai-bd/supremeai-frontend',
    });

    expect(parseGitHubRepoSlug('https://gitlab.com/org/repo')).toBeNull();
  });

  it('sanitizes URLs and blocks unsafe protocols', () => {
    expect(sanitizeExternalRepoUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeExternalRepoUrl('https://gitlab.com/org/repo')).toBe(
      'https://gitlab.com/org/repo'
    );
  });

  it('builds GitHub open and fork URLs properly', () => {
    expect(buildGitHubOpenUrl('https://github.com/Supremeai-bd/supremeai', 'main')).toBe(
      'https://github.com/Supremeai-bd/supremeai'
    );
    expect(buildGitHubOpenUrl('https://github.com/Supremeai-bd/supremeai', 'feat/ui')).toBe(
      'https://github.com/Supremeai-bd/supremeai/tree/feat%2Fui'
    );
    expect(buildGitHubForkUrl('https://github.com/Supremeai-bd/supremeai')).toBe(
      'https://github.com/Supremeai-bd/supremeai/fork'
    );
  });

  it('maps GitHub Actions workflow runs to normalized build statuses', () => {
    expect(mapWorkflowRunToBuildStatus(null)).toBe('unknown');
    expect(mapWorkflowRunToBuildStatus({ status: 'in_progress', conclusion: null })).toBe(
      'building'
    );
    expect(mapWorkflowRunToBuildStatus({ status: 'queued', conclusion: null })).toBe('building');
    expect(mapWorkflowRunToBuildStatus({ status: 'completed', conclusion: 'success' })).toBe(
      'passing'
    );
    expect(mapWorkflowRunToBuildStatus({ status: 'completed', conclusion: 'failure' })).toBe(
      'failing'
    );
    expect(mapWorkflowRunToBuildStatus({ status: 'completed', conclusion: 'cancelled' })).toBe(
      'unknown'
    );
  });

  it('creates forked project payloads preserving branch and attribution', () => {
    const source: UserProject = {
      id: 'proj_1',
      name: 'supremeai',
      repoUrl: 'https://github.com/Supremeai-bd/supremeai',
      branch: 'develop',
      description: 'Core engine',
      language: 'TypeScript',
      stars: 20,
      lastSynced: 1000,
      aiReviewStatus: 'reviewed',
      buildStatus: 'passing',
    };

    const forked = createForkedProjectPayload(source, 'niloy');
    expect(forked.name).toBe('supremeai-fork');
    expect(forked.repoUrl).toBe('https://github.com/niloy/supremeai');
    expect(forked.branch).toBe('develop');
    expect(forked.forkedFrom).toBe('Supremeai-bd/supremeai');
    expect(forked.buildStatus).toBe('passing');
  });
});
