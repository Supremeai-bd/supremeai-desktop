import React from 'react';
import {
  FolderGit2,
  GitBranch,
  GitFork,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Copy,
  Check,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  CircleDot,
  RefreshCw,
} from 'lucide-react';
import type { ProjectBuildStatus, UserProject } from '../../types';
import { useI18n } from '../../utils/i18n';
import { buildGitHubOpenUrl, sanitizeExternalRepoUrl } from '../../utils/projectRepoUtils';

interface ProjectCardProps {
  project: UserProject;
  isCopied: boolean;
  isForking: boolean;
  isRefreshingStatus: boolean;
  onCopyClone: (repoUrl: string, id: string) => void;
  onDelete: (id: string) => void;
  onChatWithProject: (project: UserProject) => void;
  onTriggerCodeReview: (project: UserProject) => void;
  onForkProject: (project: UserProject) => void | Promise<void>;
  onRefreshBuildStatus: (id: string) => void | Promise<void>;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  isCopied,
  isForking,
  isRefreshingStatus,
  onCopyClone,
  onDelete,
  onChatWithProject,
  onTriggerCodeReview,
  onForkProject,
  onRefreshBuildStatus,
}) => {
  const { t } = useI18n();
  const buildStatus: ProjectBuildStatus = project.buildStatus || 'unknown';
  const openGithubUrl = buildGitHubOpenUrl(project.repoUrl, project.branch);
  const safeBuildUrl = project.buildUrl ? sanitizeExternalRepoUrl(project.buildUrl) : null;

  const statusMeta: Record<
    ProjectBuildStatus,
    { label: string; badgeClass: string; dotClass: string; icon: React.ReactNode }
  > = {
    passing: {
      label: t.buildPassing,
      badgeClass:
        'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/70',
      dotClass: 'text-emerald-600 dark:text-emerald-400',
      icon: <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />,
    },
    failing: {
      label: t.buildFailing,
      badgeClass:
        'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/70',
      dotClass: 'text-rose-600 dark:text-rose-400',
      icon: <XCircle className="w-3.5 h-3.5 shrink-0" />,
    },
    building: {
      label: t.buildRunning,
      badgeClass:
        'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/70',
      dotClass: 'text-amber-600 dark:text-amber-400',
      icon: <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />,
    },
    unknown: {
      label: t.buildUnknown,
      badgeClass:
        'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
      dotClass: 'text-slate-500 dark:text-slate-400',
      icon: <CircleDot className="w-3.5 h-3.5 shrink-0" />,
    },
  };

  const currentStatus = statusMeta[buildStatus];

  return (
    <article
      data-testid={`project-card-${project.id}`}
      className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs group"
    >
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 shrink-0">
              <FolderGit2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {project.name}
              </h3>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                <span>{project.language}</span>
                {project.forkedFrom && (
                  <>
                    <span>·</span>
                    <span className="truncate font-mono text-[10px] text-slate-500 dark:text-slate-400">
                      {t.forkedFromLabel} {project.forkedFrom}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onDelete(project.id)}
            aria-label={`${t.removeProjectAriaLabel} ${project.name}`}
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
          {project.description}
        </p>

        {/* Project Health Strip: Current Branch & Build Status */}
        <div className="mt-3.5 px-3 py-2 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="inline-flex items-center gap-1.5 min-w-0">
            <GitBranch className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {t.currentBranchLabel}:
            </span>
            <span
              data-testid="project-card-branch"
              className="font-mono font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[140px]"
            >
              {project.branch}
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5">
            {safeBuildUrl ? (
              <a
                href={safeBuildUrl}
                target="_blank"
                rel="noreferrer"
                data-testid="project-card-build-status"
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium transition-opacity hover:opacity-85 ${currentStatus.badgeClass}`}
              >
                <span className={currentStatus.dotClass}>{currentStatus.icon}</span>
                <span>
                  {t.buildStatusLabel}: {currentStatus.label}
                </span>
              </a>
            ) : (
              <span
                data-testid="project-card-build-status"
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium ${currentStatus.badgeClass}`}
              >
                <span className={currentStatus.dotClass}>{currentStatus.icon}</span>
                <span>
                  {t.buildStatusLabel}: {currentStatus.label}
                </span>
              </span>
            )}

            <button
              type="button"
              onClick={() => onRefreshBuildStatus(project.id)}
              disabled={isRefreshingStatus}
              aria-label={`${t.refreshBuildStatusAriaLabel} ${project.name}`}
              title={`${t.refreshBuildStatusAriaLabel} ${project.name}`}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3 h-3 ${isRefreshingStatus ? 'animate-spin text-blue-500' : ''}`}
              />
            </button>
          </div>
        </div>

        {/* Quick Repository Actions: Fork Repository & Open in GitHub */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onForkProject(project)}
            disabled={isForking}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer disabled:opacity-60"
          >
            {isForking ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
            ) : (
              <GitFork className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            )}
            <span>{isForking ? t.forkingRepoBtn : t.forkRepositoryBtn}</span>
          </button>

          <a
            href={openGithubUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>{t.openInGithubBtn}</span>
          </a>
        </div>
      </div>

      {/* Bottom Studio Actions */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onCopyClone(project.repoUrl, project.id)}
          className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          {isCopied ? (
            <>
              <Check className="w-3 h-3 text-emerald-600" />
              <span className="text-emerald-600">{t.copiedBtn}</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>{t.gitCloneBtn}</span>
            </>
          )}
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onTriggerCodeReview(project)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-purple-500" />
            <span>{t.aiReviewBtn}</span>
          </button>

          <button
            type="button"
            onClick={() => onChatWithProject(project)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
          >
            <MessageSquare className="w-3 h-3" />
            <span>{t.askSupremeAiBtn}</span>
          </button>
        </div>
      </div>
    </article>
  );
};
