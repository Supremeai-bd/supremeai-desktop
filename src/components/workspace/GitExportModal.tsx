import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  Download,
  X,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  FolderGit2,
} from 'lucide-react';
import {
  GitOAuthStatus,
  GitProvider,
  GitPushResult,
  loadGitTokens,
  saveGitTokens,
  suggestArtifactFilename,
  buildProjectExportFiles,
  pushToGitHub,
  pushToGitLab,
  fetchGitOAuthStatus,
  connectGitOAuthPopup,
} from '../../services/gitExportService';
import { toast } from '../../stores/useToastStore';
import { useI18n } from '../../utils/i18n';
import type { VirtualProjectFile } from '../../utils/artifactStreamParser';
import { downloadProjectZip } from '../../utils/projectZipExport';

interface GitExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  lang: string;
  fileName?: string;
  standaloneHtml?: string;
  projectFiles?: VirtualProjectFile[];
  projectTitle?: string;
}

export const GitExportModal: React.FC<GitExportModalProps> = ({
  isOpen,
  onClose,
  code,
  lang,
  fileName,
  standaloneHtml,
  projectFiles,
  projectTitle,
}) => {
  const { t } = useI18n();
  const [providerTab, setProviderTab] = useState<'github' | 'gitlab' | 'download'>('github');

  const [githubToken, setGithubToken] = useState('');
  const [gitlabToken, setGitlabToken] = useState('');
  const [gitlabHost, setGitlabHost] = useState('https://gitlab.com');

  const [githubRepo, setGithubRepo] = useState('');
  const [gitlabProject, setGitlabProject] = useState('');
  const [branch, setBranch] = useState('main');
  const [filePath, setFilePath] = useState('');
  const [commitMessage, setCommitMessage] = useState('feat: update app from SupremeAI Studio');
  const [includeHtmlBundle, setIncludeHtmlBundle] = useState(Boolean(standaloneHtml));
  const [createPullRequest, setCreatePullRequest] = useState(false);
  const [showTokenPanel, setShowTokenPanel] = useState(false);

  const [isPushing, setIsPushing] = useState(false);
  const [isOAuthConnecting, setIsOAuthConnecting] = useState(false);
  const [oauthStatus, setOauthStatus] = useState<GitOAuthStatus | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pushResult, setPushResult] = useState<GitPushResult | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const saved = loadGitTokens();
    setGithubToken(saved.githubToken);
    setGitlabToken(saved.gitlabToken);
    setGitlabHost(saved.gitlabHost || 'https://gitlab.com');
    setGithubRepo(saved.defaultGithubRepo || '');
    setGitlabProject(saved.defaultGitlabProject || '');
    setFilePath(fileName || suggestArtifactFilename(lang, code));
    setIncludeHtmlBundle(
      Boolean(standaloneHtml) && (fileName || suggestArtifactFilename(lang, code)) !== 'index.html'
    );
    setErrorMsg(null);
    setPushResult(null);
    // Automatically expand token input if current provider has no saved PAT yet
    setShowTokenPanel(
      (providerTab === 'github' && !saved.githubToken) ||
        (providerTab === 'gitlab' && !saved.gitlabToken)
    );
    void fetchGitOAuthStatus().then((status) => setOauthStatus(status));
  }, [isOpen, lang, fileName, standaloneHtml]);

  const handleOAuthConnect = async (provider: GitProvider) => {
    setErrorMsg(null);
    setIsOAuthConnecting(true);
    try {
      const res = await connectGitOAuthPopup(
        provider,
        provider === 'gitlab' ? gitlabHost : undefined
      );
      if (provider === 'github') {
        setGithubToken(res.token);
      } else {
        setGitlabToken(res.token);
        if (res.host) setGitlabHost(res.host);
      }
      toast.success(
        provider === 'github' ? t.gitProviderGithub : t.gitProviderGitlab,
        t.gitOAuthConnected
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'OAuth connection failed.';
      setErrorMsg(msg);
      toast.error(provider === 'github' ? t.gitProviderGithub : t.gitProviderGitlab, msg);
    } finally {
      setIsOAuthConnecting(false);
    }
  };

  if (!isOpen) return null;

  const handleSaveTokenSnapshot = (provider: GitProvider) => {
    saveGitTokens({
      githubToken,
      gitlabToken,
      gitlabHost,
      defaultGithubRepo: githubRepo,
      defaultGitlabProject: gitlabProject,
    });
    if (provider === 'github' && !githubToken.trim()) return;
    if (provider === 'gitlab' && !gitlabToken.trim()) return;
  };

  const handlePush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setErrorMsg('No code present in the active buffer to export.');
      return;
    }

    setErrorMsg(null);
    setPushResult(null);
    setIsPushing(true);

    try {
      const files =
        projectFiles && projectFiles.length > 0
          ? [
              ...projectFiles.map((f) => ({ path: f.path, content: f.content })),
              ...(includeHtmlBundle &&
              standaloneHtml &&
              !projectFiles.some((f) => f.path.toLowerCase() === 'preview.html')
                ? [{ path: 'preview.html', content: standaloneHtml }]
                : []),
            ]
          : buildProjectExportFiles({
              code,
              lang,
              filePath: filePath || suggestArtifactFilename(lang, code),
              standaloneHtml: includeHtmlBundle ? standaloneHtml : undefined,
            });

      if (providerTab === 'github') {
        handleSaveTokenSnapshot('github');
        const res = await pushToGitHub({
          token: githubToken,
          repo: githubRepo,
          branch,
          files,
          commitMessage,
          createPullRequest,
        });
        setPushResult(res);
        toast.success(
          'GitHub Push Complete',
          `${res.filesCommitted} file(s) committed to ${res.branch}`
        );
      } else if (providerTab === 'gitlab') {
        handleSaveTokenSnapshot('gitlab');
        const res = await pushToGitLab({
          token: gitlabToken,
          project: gitlabProject,
          host: gitlabHost,
          branch,
          files,
          commitMessage,
          createMergeRequest: createPullRequest,
        });
        setPushResult(res);
        toast.success(
          'GitLab Push Complete',
          `${res.filesCommitted} file(s) committed to ${res.branch}`
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Git export failed';
      setErrorMsg(msg);
      toast.error('Git Export Failed', msg);
    } finally {
      setIsPushing(false);
    }
  };

  const triggerDownload = (content: string, downloadName: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.gitModalTitle}
        className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101b] text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <FolderGit2 className="w-4 h-4 text-cyan-500 shrink-0" />
            <h2 className="text-sm font-semibold truncate">{t.gitModalTitle}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Provider Segmented Switch */}
        <div className="px-5 pt-4">
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setProviderTab('github');
                setErrorMsg(null);
              }}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                providerTab === 'github'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {t.gitProviderGithub}
            </button>
            <button
              type="button"
              onClick={() => {
                setProviderTab('gitlab');
                setErrorMsg(null);
              }}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                providerTab === 'gitlab'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {t.gitProviderGitlab}
            </button>
            <button
              type="button"
              onClick={() => {
                setProviderTab('download');
                setErrorMsg(null);
              }}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                providerTab === 'download'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {t.gitDownloadTab}
            </button>
          </div>
        </div>

        {providerTab === 'download' ? (
          <div className="p-5 space-y-4">
            <div className="space-y-2.5 text-xs">
              {projectFiles && projectFiles.length > 0 && (
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-cyan-500/30 bg-cyan-500/5">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {projectTitle || t.wsGeneratedProjectGroup}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                      {projectFiles.length} files · ZIP archive
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      downloadProjectZip(
                        projectTitle || filePath || 'supremeai-project',
                        projectFiles
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs cursor-pointer whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t.wsDownloadProjectZip}</span>
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {filePath || suggestArtifactFilename(lang, code)}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {code.split('\n').length} {t.wsLinesLabel} · {lang.toUpperCase()}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    triggerDownload(
                      code,
                      (filePath || suggestArtifactFilename(lang, code)).split('/').pop() ||
                        'code.txt',
                      'text/plain;charset=utf-8'
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t.wsDownloadFile}</span>
                </button>
              </div>

              {standaloneHtml && (
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      preview.html
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Standalone browser bundle
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      triggerDownload(
                        standaloneHtml,
                        'supremeai-preview.html',
                        'text/html;charset=utf-8'
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:border-cyan-500/50 text-slate-700 dark:text-slate-200 font-semibold text-xs cursor-pointer whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t.wsDownloadHtml}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handlePush} className="p-5 space-y-3.5 text-xs">
            {providerTab === 'github' ? (
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                  {t.gitRepoLabel}
                </label>
                <input
                  type="text"
                  required
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  placeholder="Supremeai-bd/my-app"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs outline-none focus:border-cyan-500"
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                    {t.gitProjectLabel}
                  </label>
                  <input
                    type="text"
                    required
                    value={gitlabProject}
                    onChange={(e) => setGitlabProject(e.target.value)}
                    placeholder="team/my-app"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                    {t.gitHostLabel}
                  </label>
                  <input
                    type="url"
                    value={gitlabHost}
                    onChange={(e) => setGitlabHost(e.target.value)}
                    placeholder="https://gitlab.com"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                  {t.gitBranchLabel}
                </label>
                <input
                  type="text"
                  required
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                  {t.gitFilePathLabel}
                </label>
                <input
                  type="text"
                  required
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  placeholder="src/App.tsx"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                {t.gitCommitMsgLabel}
              </label>
              <input
                type="text"
                required
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-2 pt-0.5">
              <label className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createPullRequest}
                  onChange={(e) => setCreatePullRequest(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 accent-cyan-500"
                />
                <span>{providerTab === 'github' ? t.gitCreatePrToggle : t.gitCreateMrToggle}</span>
              </label>

              {standaloneHtml && (
                <label className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeHtmlBundle}
                    onChange={(e) => setIncludeHtmlBundle(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-700 accent-cyan-500"
                  />
                  <span>{t.gitIncludeHtmlBundle}</span>
                </label>
              )}
            </div>

            {/* 1-Click OAuth Connect + Collapsible Local PAT Token Section */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-900/70 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowTokenPanel((v) => !v)}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-cyan-500" />
                  <span>{t.gitTokenSectionTitle}</span>
                  {showTokenPanel ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>
                <button
                  type="button"
                  data-testid={`git-oauth-connect-${providerTab}`}
                  disabled={isOAuthConnecting}
                  onClick={() => handleOAuthConnect(providerTab === 'gitlab' ? 'gitlab' : 'github')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-700 dark:text-cyan-300 text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {isOAuthConnecting ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>{t.gitOAuthConnecting}</span>
                    </>
                  ) : (
                    <>
                      <GitBranch className="w-3 h-3" />
                      <span>
                        {providerTab === 'gitlab'
                          ? t.gitOAuthConnectGitlab
                          : t.gitOAuthConnectGithub}
                      </span>
                    </>
                  )}
                </button>
              </div>
              {showTokenPanel && (
                <div className="p-3 bg-white dark:bg-[#090e18] border-t border-slate-200 dark:border-slate-800 space-y-2">
                  {providerTab === 'github' ? (
                    <input
                      type="password"
                      value={githubToken}
                      onChange={(e) => setGithubToken(e.target.value)}
                      placeholder={t.gitTokenGithubPlaceholder}
                      autoComplete="off"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs outline-none focus:border-cyan-500"
                    />
                  ) : (
                    <input
                      type="password"
                      value={gitlabToken}
                      onChange={(e) => setGitlabToken(e.target.value)}
                      placeholder={t.gitTokenGitlabPlaceholder}
                      autoComplete="off"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs outline-none focus:border-cyan-500"
                    />
                  )}
                  {oauthStatus && (
                    <div className="text-[10px] font-mono text-slate-400 break-all">
                      {t.gitOAuthCallbackHint}:{' '}
                      {providerTab === 'gitlab'
                        ? oauthStatus.gitlabCallbackUrl
                        : oauthStatus.githubCallbackUrl}
                    </div>
                  )}
                </div>
              )}
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-600 dark:text-rose-400"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {pushResult && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    {pushResult.filesCommitted} file(s) · {pushResult.branch}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={pushResult.commitUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-[11px] font-semibold"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>{t.gitOpenCommitLink}</span>
                  </a>
                  {pushResult.prUrl && (
                    <a
                      href={pushResult.prUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-[11px] font-semibold"
                    >
                      <GitBranch className="w-3 h-3" />
                      <span>{t.gitOpenPrLink}</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {t.close}
              </button>
              <button
                type="submit"
                disabled={isPushing}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold text-xs cursor-pointer whitespace-nowrap"
              >
                {isPushing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{t.gitPushingBtn}</span>
                  </>
                ) : (
                  <>
                    <GitBranch className="w-3.5 h-3.5" />
                    <span>{t.gitPushNowBtn}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
