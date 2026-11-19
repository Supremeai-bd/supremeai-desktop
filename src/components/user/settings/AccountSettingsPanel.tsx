import React from 'react';
import {
  Save,
  Laptop,
  LogOut,
  KeyRound,
  ShieldAlert,
  MessageSquarePlus,
  Loader2,
  FolderGit2,
  GitBranch,
} from 'lucide-react';
import { useI18n } from '../../../utils/i18n';
import type {
  GitOAuthStatus,
  GitProvider,
  GitTokenSettings,
} from '../../../services/gitExportService';
import { toast } from '../../../stores/useToastStore';
import { saveGitTokens } from '../../../services/gitExportService';

interface AccountSettingsPanelProps {
  isAdminEligible: boolean;
  trustedUntil: number | null;
  onRevokeTrustedBrowser?: () => void;
  onOpenFeedbackSurvey?: () => void;
  onSignOut?: () => void;
  gitOAuthStatus: GitOAuthStatus | null;
  gitOAuthConnecting: GitProvider | null;
  gitTokensState: GitTokenSettings;
  setGitTokensState: React.Dispatch<React.SetStateAction<GitTokenSettings>>;
  handleSettingsGitOAuthConnect: (provider: GitProvider) => Promise<void>;
}

export const AccountSettingsPanel: React.FC<AccountSettingsPanelProps> = ({
  isAdminEligible,
  trustedUntil,
  onRevokeTrustedBrowser,
  onOpenFeedbackSurvey,
  onSignOut,
  gitOAuthStatus,
  gitOAuthConnecting,
  gitTokensState,
  setGitTokensState,
  handleSettingsGitOAuthConnect,
}) => {
  const { t } = useI18n();

  return (
    <>
      <div className="space-y-6">
        {/* Security & 2-Step Authentication & Trusted Browser Card (Admin-Eligible only) */}
        {Boolean(isAdminEligible) && (
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-cyan-500" />
              <span>{t.security2StepTitle}</span>
            </h2>

            <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                    {t.totpBiometricLabel}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    {t.totpBiometricDesc}
                  </span>
                </div>
                <span className="text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                  ENFORCED
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3">
                <div>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Laptop className="w-4 h-4 text-cyan-500" />
                    <span>{t.trustedPolicyTitle}</span>
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    {trustedUntil && trustedUntil > Date.now() ? (
                      <>
                        <strong className="text-cyan-500 dark:text-cyan-400 font-mono">
                          {new Date(trustedUntil).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </strong>{' '}
                        (
                        {Math.max(
                          1,
                          Math.ceil((trustedUntil - Date.now()) / (24 * 60 * 60 * 1000))
                        )}
                        d)
                      </>
                    ) : (
                      t.noTrustedTokenMsg
                    )}
                  </span>
                </div>

                {trustedUntil && trustedUntil > Date.now() && onRevokeTrustedBrowser && (
                  <button
                    type="button"
                    onClick={onRevokeTrustedBrowser}
                    className="px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-xs font-medium transition-colors cursor-pointer self-start sm:self-auto whitespace-nowrap"
                  >
                    {t.revokeTrustedBtn}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* GitHub & GitLab Local PAT Integration Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-xs">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-cyan-500" />
                <span>{t.gitSettingsCardTitle}</span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {t.gitSettingsCardDesc}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                data-testid="settings-oauth-github"
                disabled={gitOAuthConnecting !== null}
                onClick={() => handleSettingsGitOAuthConnect('github')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                {gitOAuthConnecting === 'github' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <GitBranch className="w-3.5 h-3.5" />
                )}
                <span>
                  {gitOAuthConnecting === 'github' ? t.gitOAuthConnecting : t.gitOAuthConnectGithub}
                </span>
              </button>
              <button
                type="button"
                data-testid="settings-oauth-gitlab"
                disabled={gitOAuthConnecting !== null}
                onClick={() => handleSettingsGitOAuthConnect('gitlab')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                {gitOAuthConnecting === 'gitlab' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <GitBranch className="w-3.5 h-3.5" />
                )}
                <span>
                  {gitOAuthConnecting === 'gitlab' ? t.gitOAuthConnecting : t.gitOAuthConnectGitlab}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  saveGitTokens(gitTokensState);
                  toast.success(t.gitSettingsCardTitle, t.gitTokensSavedMsg);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg theme-btn-primary text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{t.gitSaveTokensBtn}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                GitHub PAT
              </label>
              <input
                type="password"
                autoComplete="off"
                value={gitTokensState.githubToken}
                onChange={(e) => setGitTokensState((s) => ({ ...s, githubToken: e.target.value }))}
                placeholder={t.gitTokenGithubPlaceholder}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 font-mono text-xs outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                {t.gitRepoLabel}
              </label>
              <input
                type="text"
                value={gitTokensState.defaultGithubRepo}
                onChange={(e) =>
                  setGitTokensState((s) => ({ ...s, defaultGithubRepo: e.target.value }))
                }
                placeholder="Supremeai-bd/my-app"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 font-mono text-xs outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                GitLab PAT
              </label>
              <input
                type="password"
                autoComplete="off"
                value={gitTokensState.gitlabToken}
                onChange={(e) => setGitTokensState((s) => ({ ...s, gitlabToken: e.target.value }))}
                placeholder={t.gitTokenGitlabPlaceholder}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 font-mono text-xs outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                {t.gitHostLabel}
              </label>
              <input
                type="url"
                value={gitTokensState.gitlabHost}
                onChange={(e) => setGitTokensState((s) => ({ ...s, gitlabHost: e.target.value }))}
                placeholder="https://gitlab.com"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 font-mono text-xs outline-none focus:border-cyan-500"
              />
            </div>
          </div>
          {gitOAuthStatus && (
            <div className="text-[11px] font-mono text-slate-400 break-all pt-1">
              {t.gitOAuthCallbackHint}: {gitOAuthStatus.githubCallbackUrl} ·{' '}
              {gitOAuthStatus.gitlabCallbackUrl}
            </div>
          )}
        </div>

        {/* Product Feedback & Suggestions Card */}
        {onOpenFeedbackSurvey && (
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <MessageSquarePlus className="w-4 h-4 theme-accent-text" />
                <span>{t.feedbackCardTitle}</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {t.feedbackCardDesc}
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenFeedbackSurvey}
              className="px-4 py-2 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-[var(--theme-accent)] text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {t.shareFeedbackBtn}
            </button>
          </div>
        )}

        {/* Account Session Sign Out Card */}
        <div className="p-5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div>
            <h3 className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span>{t.activeSessionMgmtTitle}</span>
            </h3>
            <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">
              {t.activeSessionMgmtDesc}
            </p>
          </div>

          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t.signOutSupremeBtn}</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
};
