import { useState, type FormEvent } from 'react';
import {
  BookOpen,
  Check,
  Code2,
  Download,
  ExternalLink,
  FolderGit2,
  MessageSquare,
  Monitor,
  Moon,
  Pin,
  Plus,
  Search,
  Sparkles,
  Square,
  Sun,
  Trash2,
  Volume2,
} from 'lucide-react';
import { LIVE_THEMES } from '../data/studioData';
import { MAX_SPEED, MIN_SPEED } from '../companion/ttsService';
import type { VoicePersona } from '../companion/speechUtils';
import { useSpeech } from '../hooks/useSpeech';
import { APP_LANGUAGE_OPTIONS, dateLocale, format, useI18n } from '../i18n';
import type {
  DesktopProject,
  KnowledgeDoc,
  LiveThemeId,
  RolePersona,
  SavedChat,
  ThemeConfig,
  ThemeMode,
} from '../types/studio';

/* ================= ALL CONVERSATIONS ================= */

export function ChatHistoryView({
  sessions,
  onOpenChat,
  onTogglePin,
  onExportChat,
  onDeleteChat,
  onNewChat,
}: {
  sessions: SavedChat[];
  onOpenChat: (chat: SavedChat) => void;
  onTogglePin: (id: string) => void;
  onExportChat: (chat: SavedChat) => void;
  onDeleteChat: (id: string) => void;
  onNewChat: () => void;
}) {
  const { t, lang } = useI18n();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pinned'>('all');

  const q = search.trim().toLowerCase();
  const filtered = sessions
    .filter((s) => (filter === 'pinned' ? Boolean(s.isPinned) : true))
    .filter(
      (s) =>
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.messages.some((m) => m.content.toLowerCase().includes(q))
    )
    .sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="w-full max-w-4xl mx-auto px-6 py-8 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {t.allConversations}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.historySubtitle}</p>
        </div>
        <button
          type="button"
          onClick={onNewChat}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold theme-btn-primary cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t.newChat}</span>
        </button>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex-1 min-w-[220px] flex items-center gap-2 px-3 py-2 rounded-xl border theme-input-surface text-slate-500">
          <Search className="w-4 h-4 shrink-0" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.filterConversations}
            className="w-full bg-transparent border-0 outline-none text-sm text-slate-900 dark:text-slate-100"
          />
        </label>

        <div className="flex items-center gap-1 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60">
          {(['all', 'pinned'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filter === tab
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab === 'all' ? `${t.allConversations} (${sessions.length})` : t.pinnedChats}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-10 rounded-2xl border theme-surface-glass text-center space-y-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {q ? t.noMatchingConversations : t.emptyHistory}
          </p>
          <button
            type="button"
            onClick={onNewChat}
            className="px-4 py-2 rounded-xl text-xs font-semibold theme-btn-primary cursor-pointer"
          >
            {t.newChat}
          </button>
        </div>
      ) : (
        <div className="divide-y divide-slate-200/70 dark:divide-slate-800/80 rounded-2xl border theme-surface-glass overflow-hidden">
          {filtered.map((chat) => (
            <div
              key={chat.id}
              className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <button
                type="button"
                onClick={() => onOpenChat(chat)}
                className="flex-1 min-w-0 text-left cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {chat.title}
                  </span>
                  {chat.isPinned && <Pin className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  <span>{chat.messages.length} messages</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {new Intl.DateTimeFormat(dateLocale(lang), {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(chat.updatedAt)}
                  </span>
                </div>
              </button>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onTogglePin(chat.id)}
                  aria-label={chat.isPinned ? t.unpinConversation : t.pinConversation}
                  className={`p-2 rounded-lg cursor-pointer transition-colors ${
                    chat.isPinned
                      ? 'text-amber-500 bg-amber-500/10'
                      : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
                  }`}
                >
                  <Pin className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onExportChat(chat)}
                  aria-label={t.exportConversation}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteChat(chat.id)}
                  aria-label={t.deleteConversation}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================= ROLES & PERSONAS ================= */

export function RolesView({
  roles,
  activeRoleId,
  onSelectRole,
  onAddRole,
  onDeleteRole,
}: {
  roles: RolePersona[];
  activeRoleId: string;
  onSelectRole: (role: RolePersona) => void;
  onAddRole: (role: RolePersona) => void;
  onDeleteRole: (id: string) => void;
}) {
  const { t } = useI18n();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [instruction, setInstruction] = useState('');

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !instruction.trim()) return;
    const role: RolePersona = {
      id: `custom-role-${Date.now()}`,
      name: name.trim(),
      category: 'Custom',
      tagline: tagline.trim() || 'Custom desktop workflow persona',
      description: tagline.trim() || instruction.trim().slice(0, 120),
      suggestedModel: 'auto',
      systemInstruction: instruction.trim(),
      quickPrompts: [
        `Help me get started using the ${name.trim()} workflow.`,
        'Summarize my next three engineering priorities.',
      ],
      isCustom: true,
    };
    onAddRole(role);
    onSelectRole(role);
    setName('');
    setTagline('');
    setInstruction('');
    setShowCreate(false);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-8 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {t.rolesAndPersonas}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.rolesSubtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold theme-btn-primary cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t.addCustomRole}</span>
        </button>
      </header>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="p-5 rounded-2xl border theme-surface-glass space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Persona name (e.g. Rust Tauri Maintainer)"
              className="px-3 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100"
            />
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Short description"
              className="px-3 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100"
            />
          </div>
          <textarea
            rows={3}
            required
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="System instruction for how SupremeAI should reason and format answers…"
            className="w-full px-3 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
            >
              {t.close}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-semibold theme-btn-primary cursor-pointer"
            >
              {t.addCustomRole}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roles.map((role) => {
          const active = role.id === activeRoleId;
          return (
            <article
              key={role.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                active ? 'theme-accent-active' : 'theme-surface-glass'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {role.category} · {role.suggestedModel}
                    </div>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white mt-0.5">
                      {role.name}
                    </h2>
                  </div>
                  {role.isCustom && (
                    <button
                      type="button"
                      onClick={() => onDeleteRole(role.id)}
                      aria-label={`Delete ${role.name}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {role.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200/60 dark:border-slate-800/70">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {role.quickPrompts.length} starter prompts
                </span>
                <button
                  type="button"
                  onClick={() => onSelectRole(role)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                      : 'theme-btn-primary'
                  }`}
                >
                  {active ? <Check className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{active ? 'Active Persona' : 'Use in Chat'}</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

/* ================= PROJECTS ================= */

export function ProjectsView({
  projects,
  onAddProject,
  onDeleteProject,
  onChatWithProject,
  onReviewProject,
}: {
  projects: DesktopProject[];
  onAddProject: (project: DesktopProject) => void;
  onDeleteProject: (id: string) => void;
  onChatWithProject: (project: DesktopProject) => void;
  onReviewProject: (project: DesktopProject) => void;
}) {
  const { t } = useI18n();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [description, setDescription] = useState('');

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddProject({
      id: `proj-${Date.now()}`,
      name: name.trim(),
      repoUrl: repoUrl.trim() || `https://github.com/Supremeai-bd/${name.trim()}`,
      branch: branch.trim() || 'main',
      language: 'TypeScript',
      description: description.trim() || 'Connected desktop workspace repository.',
      status: 'Active',
      updatedAt: 'Added just now',
    });
    setName('');
    setRepoUrl('');
    setBranch('main');
    setDescription('');
    setShowAdd(false);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-8 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {t.projects}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.projectsSubtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold theme-btn-primary cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t.addProject}</span>
        </button>
      </header>

      {showAdd && (
        <form onSubmit={handleAdd} className="p-5 rounded-2xl border theme-surface-glass space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Repository name"
              className="px-3 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100"
            />
            <input
              type="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/org/repo"
              className="px-3 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100"
            />
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="Branch (main)"
              className="px-3 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100"
            />
          </div>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief project summary"
            className="w-full px-3 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
            >
              {t.close}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-semibold theme-btn-primary cursor-pointer"
            >
              {t.addProject}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <article
            key={project.id}
            className="p-5 rounded-2xl border theme-surface-glass flex flex-col justify-between gap-4"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FolderGit2 className="w-4 h-4 theme-accent-text shrink-0" />
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {project.name}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteProject(project.id)}
                  aria-label={`Remove ${project.name}`}
                  className="p-1 rounded-md text-slate-400 hover:text-rose-500 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                {project.branch} · {project.language}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {project.description}
              </p>

              <a
                href={project.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] theme-accent-text hover:underline"
              >
                <span className="truncate max-w-[220px]">{project.repoUrl.replace(/^https?:\/\//, '')}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-slate-200/70 dark:border-slate-800/80">
              <button
                type="button"
                onClick={() => onChatWithProject(project)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold theme-btn-primary cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{t.chatWithProject}</span>
              </button>
              <button
                type="button"
                onClick={() => onReviewProject(project)}
                className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>{t.runCodeReview}</span>
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

/* ================= KNOWLEDGE BASE (RAG) ================= */

export function KnowledgeView({
  docs,
  onAddDoc,
  onToggleDoc,
  onDeleteDoc,
}: {
  docs: KnowledgeDoc[];
  onAddDoc: (doc: KnowledgeDoc) => void;
  onToggleDoc: (id: string) => void;
  onDeleteDoc: (id: string) => void;
}) {
  const { t } = useI18n();
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Architecture');
  const [content, setContent] = useState('');

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    onAddDoc({
      id: `kb-${Date.now()}`,
      title: title.trim(),
      category: category.trim() || 'Notes',
      content: content.trim(),
      enabled: true,
      updatedAt: Date.now(),
    });
    setTitle('');
    setContent('');
    setShowAdd(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-6 py-8 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {t.knowledgeBase}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.knowledgeSubtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold theme-btn-primary cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t.addKnowledgeDoc}</span>
        </button>
      </header>

      {showAdd && (
        <form onSubmit={handleAdd} className="p-5 rounded-2xl border theme-surface-glass space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title"
              className="sm:col-span-2 px-3 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100"
            />
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Category"
              className="px-3 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100"
            />
          </div>
          <textarea
            rows={4}
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste API notes, specifications, or product guidelines to ground SupremeAI replies…"
            className="w-full px-3 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
            >
              {t.close}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-semibold theme-btn-primary cursor-pointer"
            >
              {t.addKnowledgeDoc}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {docs.map((doc) => (
          <article
            key={doc.id}
            className="p-5 rounded-2xl border theme-surface-glass space-y-2.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{doc.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{doc.content.length} chars</span>
                </div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                  {doc.title}
                </h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onToggleDoc(doc.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    doc.enabled
                      ? 'border-emerald-500/40 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {doc.enabled ? t.groundingActive : t.groundingOff}
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteDoc(doc.id)}
                  aria-label={`Delete ${doc.title}`}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
              {doc.content}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

/* ================= FULL-PAGE SETTINGS ================= */

export function SettingsView({
  themeConfig,
  onModeChange,
  onLiveThemeChange,
  onLiveMotionChange,
  runtimeLabel,
}: {
  themeConfig: ThemeConfig;
  onModeChange: (mode: ThemeMode) => void;
  onLiveThemeChange: (id: LiveThemeId) => void;
  onLiveMotionChange: (enabled: boolean) => void;
  runtimeLabel: string;
}) {
  const { lang, setLang, t } = useI18n();
  const { config: voice, updateConfig, speak, stop: stopSpeaking, speaking } = useSpeech();

  const modes: Array<{ id: ThemeMode; label: string; icon: typeof Sun }> = [
    { id: 'system', label: t.themeSystemOption, icon: Monitor },
    { id: 'light', label: t.themeLightOption, icon: Sun },
    { id: 'dark', label: t.themeDarkOption, icon: Moon },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-6 py-8 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          {t.settingsTitle}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.settingsSubtitle}</p>
      </header>

      {/* Language */}
      <section className="p-5 rounded-2xl border theme-surface-glass space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t.languageSection}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t.languageHint}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label={t.languageSection}>
          {APP_LANGUAGE_OPTIONS.map((option) => {
            const active = lang === option.id;
            const desc = option.id === 'bn' ? t.languageBnDesc : t.languageEnDesc;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setLang(option.id)}
                className={`flex items-start justify-between gap-3 p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                  active
                    ? 'theme-accent-active'
                    : 'border-slate-200/80 dark:border-slate-700/70 bg-white/60 dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {option.label}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{desc}</p>
                </div>
                {active && <Check className="w-4 h-4 shrink-0 mt-0.5" />}
              </button>
            );
          })}
        </div>
      </section>

      {/* Appearance & Live Themes */}
      <section className="p-5 rounded-2xl border theme-surface-glass space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              {t.appearanceSection}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t.liveThemeLabel}</p>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/70 bg-white/60 dark:bg-slate-900/60">
            {modes.map((m) => {
              const Icon = m.icon;
              const active = themeConfig.mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onModeChange(m.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {LIVE_THEMES.map((theme) => {
            const active = themeConfig.liveTheme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => onLiveThemeChange(theme.id)}
                className={`flex items-center justify-between gap-2.5 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                  active
                    ? 'theme-accent-active'
                    : 'border-slate-200/80 dark:border-slate-700/70 bg-white/60 dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex items-center -space-x-1 shrink-0">
                    {theme.swatches.map((hex, i) => (
                      <span
                        key={i}
                        className="w-4 h-4 rounded-full border border-white/80 dark:border-slate-900"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {theme.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {theme.tagline}
                    </div>
                  </div>
                </div>
                {active && <Check className="w-4 h-4 shrink-0" />}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 dark:border-slate-800/80">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
            {t.liveMotionLabel}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={themeConfig.liveMotion}
            onClick={() => onLiveMotionChange(!themeConfig.liveMotion)}
            className={`w-10 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
              themeConfig.liveMotion ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                themeConfig.liveMotion ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </section>

      {/* Neural Voice */}
      <section className="p-5 rounded-2xl border theme-surface-glass space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t.voiceSection}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t.voiceSectionHint}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="space-y-1.5">
            <span className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              {t.voiceLabel}
            </span>
            <select
              value={voice.persona}
              onChange={(e) => updateConfig({ persona: e.target.value as VoicePersona })}
              className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              <option value="Zephyr">{t.voiceZephyr}</option>
              <option value="Kore">{t.voiceKore}</option>
              <option value="Puck">{t.voicePuck}</option>
              <option value="Charon">{t.voiceCharon}</option>
              <option value="Fenrir">{t.voiceFenrir}</option>
            </select>
          </label>

          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              {t.banglaAccentLabel}
            </span>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60">
              {(['bn-bd', 'bn-in'] as const).map((acc) => (
                <button
                  key={acc}
                  type="button"
                  onClick={() => updateConfig({ accent: acc })}
                  className={`py-1.5 px-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    voice.accent === acc
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {acc === 'bn-bd' ? t.accentBnBd : t.accentBnIn}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-[200px]">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
              {t.voiceSpeedLabel}
            </span>
            <input
              type="range"
              min={MIN_SPEED}
              max={MAX_SPEED}
              step={0.05}
              value={voice.speed}
              onChange={(e) => updateConfig({ speed: Number(e.target.value) })}
              className="flex-1 accent-sky-500"
            />
            <span className="font-mono tabular-nums text-xs text-slate-600 dark:text-slate-300 w-12 text-right">
              {voice.speed.toFixed(2)}×
            </span>
          </div>

          <button
            type="button"
            onClick={() => (speaking ? stopSpeaking() : void speak(t.testVoicePhrase, lang))}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 hover:border-sky-500/50 transition-colors cursor-pointer"
          >
            {speaking ? <Square className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 theme-accent-text" />}
            <span>{speaking ? t.stopSpeaking : t.testVoiceBtn}</span>
          </button>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 dark:border-slate-800/80">
          <div>
            <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {t.autoSpeakLabel}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{t.autoSpeakHint}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={voice.autoSpeak}
            onClick={() => updateConfig({ autoSpeak: !voice.autoSpeak })}
            className={`w-10 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
              voice.autoSpeak ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                voice.autoSpeak ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </section>

      {/* About */}
      <section className="p-5 rounded-2xl border theme-surface-glass flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            SupremeAI Studio Desktop
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {runtimeLabel} · Synced with supremeai-frontend
          </p>
        </div>
        <span className="font-mono text-xs text-slate-600 dark:text-slate-300 tabular-nums">
          {format('{label} {ver}', { label: t.versionLabel, ver: __APP_VERSION__ })}
        </span>
      </section>
    </div>
  );
}
