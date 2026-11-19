import React, { useState } from 'react';
import { FolderGit2, Plus, X, Search } from 'lucide-react';
import { UserProject } from '../../types';
import { useI18n } from '../../utils/i18n';
import { ProjectCard } from './ProjectCard';

interface UserProjectsViewProps {
  projects: UserProject[];
  onAddProject: (
    project: Omit<UserProject, 'id' | 'lastSynced' | 'stars' | 'aiReviewStatus'>
  ) => void;
  onDeleteProject: (id: string) => void;
  onChatWithProject: (project: UserProject) => void;
  onTriggerCodeReview: (project: UserProject) => void;
  onForkProject: (project: UserProject) => Promise<void> | void;
  onRefreshBuildStatus: (id: string) => Promise<void> | void;
}

export const UserProjectsView: React.FC<UserProjectsViewProps> = ({
  projects,
  onAddProject,
  onDeleteProject,
  onChatWithProject,
  onTriggerCodeReview,
  onForkProject,
  onRefreshBuildStatus,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [forkingId, setForkingId] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const { t } = useI18n();

  // New Project Form State
  const [name, setName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('TypeScript');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !repoUrl.trim()) return;

    onAddProject({
      name: name.trim(),
      repoUrl: repoUrl.trim(),
      branch: branch.trim() || 'main',
      description: description.trim() || 'Connected GitHub repository',
      language: language.trim() || 'TypeScript',
    });

    setName('');
    setRepoUrl('');
    setBranch('main');
    setDescription('');
    setIsModalOpen(false);
  };

  const copyCloneCmd = (url: string, id: string) => {
    const clean = url.replace(/\.git$/i, '');
    navigator.clipboard.writeText(`git clone ${clean}.git`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFork = async (project: UserProject) => {
    setForkingId(project.id);
    try {
      await onForkProject(project);
    } finally {
      setForkingId((curr) => (curr === project.id ? null : curr));
    }
  };

  const handleRefreshStatus = async (id: string) => {
    setRefreshingId(id);
    try {
      await onRefreshBuildStatus(id);
    } finally {
      setRefreshingId((curr) => (curr === id ? null : curr));
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.repoUrl.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.branch.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 workspace-container space-y-6 text-slate-800 dark:text-slate-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t.projectsTitle}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t.projectsSubtitle}</p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer shadow-xs shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t.addGithubProjectBtn}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t.filterProjectsPlaceholder}
          className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-all"
        />
      </div>

      {/* Projects Grid or Empty State */}
      {filteredProjects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-900/40 p-10 text-center space-y-3">
          <div className="mx-auto w-10 h-10 rounded-xl bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <FolderGit2 className="w-5 h-5" />
          </div>
          {projects.length === 0 ? (
            <>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                {t.noProjectsTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                {t.noProjectsDesc}
              </p>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.addGithubProjectBtn}</span>
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.noMatchingProjectsDesc}
              </p>
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                {t.clearFilterBtn}
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isCopied={copiedId === project.id}
              isForking={forkingId === project.id}
              isRefreshingStatus={refreshingId === project.id}
              onCopyClone={copyCloneCmd}
              onDelete={onDeleteProject}
              onChatWithProject={onChatWithProject}
              onTriggerCodeReview={onTriggerCodeReview}
              onForkProject={handleFork}
              onRefreshBuildStatus={handleRefreshStatus}
            />
          ))}
        </div>
      )}

      {/* Add Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold">{t.modalAddProjectTitle}</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label={t.cancelBtn}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t.projectNameLabel}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. my-awesome-app"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t.repoUrlLabel}
                </label>
                <input
                  type="url"
                  required
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/username/repo"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t.defaultBranchLabel}
                  </label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="main"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t.primaryLanguageLabel}
                  </label>
                  <input
                    type="text"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    placeholder="TypeScript"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t.descriptionLabel}
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-400 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 cursor-pointer"
                >
                  {t.cancelBtn}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-slate-900 dark:bg-white dark:text-slate-900 rounded-full transition-colors cursor-pointer shadow-xs"
                >
                  {t.saveProjectBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
