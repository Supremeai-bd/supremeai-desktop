// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ProjectCard } from './ProjectCard';
import type { UserProject } from '../../types';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const baseProject: UserProject = {
  id: 'proj_test_1',
  name: 'supremeai',
  repoUrl: 'https://github.com/Supremeai-bd/supremeai',
  branch: 'feat/health-cards',
  description: 'Core AI engine and orchestrator',
  language: 'TypeScript',
  stars: 28,
  lastSynced: 1700000000000,
  aiReviewStatus: 'reviewed',
  buildStatus: 'passing',
  buildUrl: 'https://github.com/Supremeai-bd/supremeai/actions',
};

describe('ProjectCard', () => {
  it('displays branch, build status, Fork Repository, and Open in GitHub controls', () => {
    const onFork = vi.fn();
    const onRefresh = vi.fn();

    render(
      <ProjectCard
        project={baseProject}
        isCopied={false}
        isForking={false}
        isRefreshingStatus={false}
        onCopyClone={vi.fn()}
        onDelete={vi.fn()}
        onChatWithProject={vi.fn()}
        onTriggerCodeReview={vi.fn()}
        onForkProject={onFork}
        onRefreshBuildStatus={onRefresh}
      />
    );

    expect(screen.getByTestId('project-card-branch')).toHaveTextContent('feat/health-cards');
    expect(screen.getByTestId('project-card-build-status')).toHaveTextContent(/Build:\s*Passing/i);

    const openLink = screen.getByRole('link', { name: /open in github/i });
    expect(openLink).toHaveAttribute(
      'href',
      'https://github.com/Supremeai-bd/supremeai/tree/feat%2Fhealth-cards'
    );
    expect(openLink).toHaveAttribute('target', '_blank');

    const forkBtn = screen.getByRole('button', { name: /fork repository/i });
    fireEvent.click(forkBtn);
    expect(onFork).toHaveBeenCalledWith(baseProject);

    const refreshBtn = screen.getByRole('button', { name: /refresh build status for supremeai/i });
    fireEvent.click(refreshBtn);
    expect(onRefresh).toHaveBeenCalledWith('proj_test_1');
  });

  it('renders failing build status and forkedFrom attribution', () => {
    render(
      <ProjectCard
        project={{
          ...baseProject,
          id: 'proj_fork_1',
          name: 'supremeai-fork',
          branch: 'main',
          buildStatus: 'failing',
          forkedFrom: 'Supremeai-bd/supremeai',
        }}
        isCopied={false}
        isForking={false}
        isRefreshingStatus={false}
        onCopyClone={vi.fn()}
        onDelete={vi.fn()}
        onChatWithProject={vi.fn()}
        onTriggerCodeReview={vi.fn()}
        onForkProject={vi.fn()}
        onRefreshBuildStatus={vi.fn()}
      />
    );

    expect(screen.getByTestId('project-card-build-status')).toHaveTextContent(/Build:\s*Failing/i);
    expect(screen.getByText(/Forked from Supremeai-bd\/supremeai/i)).toBeInTheDocument();
  });
});
