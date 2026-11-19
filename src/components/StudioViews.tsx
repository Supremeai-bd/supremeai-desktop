import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  AudioLines,
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
  RefreshCw,
  Search,
  Sparkles,
  Square,
  Sun,
  Trash2,
  Upload,
  Volume2,
} from 'lucide-react';
import {
  LIVE_THEMES,
  useThemeStore,
  type MotionSpeed,
  type ScrimIntensity,
  type SurfaceTone,
  type ThemeMode,
} from '../stores/useThemeStore';
import { LiveVoiceAvatarCanvas } from '../companion/LiveVoiceAvatarCanvas';
import {
  AVATAR_PRESETS,
  VOICE_AVATAR_SYNC_EVENT,
  loadAvatarPreference,
  processCustomFaceUpload,
  resolveAvatarSource,
  saveAvatarPreference,
  saveVoicePreference,
  type AvatarPreference,
  type AvatarPresetId,
} from '../companion/hologramAvatar';
import { MAX_SPEED, MIN_SPEED } from '../companion/ttsService';
import type { VoicePersona } from '../companion/speechUtils';
import { useSpeech } from '../hooks/useSpeech';
import { APP_LANGUAGE_OPTIONS, dateLocale, format, useI18n } from '../i18n';
import type {
  DesktopProject,
  KnowledgeDoc,
  RolePersona,
  SavedChat,
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
      suggestedModel: 'supreme-core',
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
  onOpenCompanion,
  runtimeLabel,
  syncEnabled,
  lastSyncedAt,
  onToggleSync,
  onSyncNow,
}: {
  onOpenCompanion: () => void;
  runtimeLabel: string;
  syncEnabled: boolean;
  lastSyncedAt: number | null;
  onToggleSync: (enabled: boolean) => void;
  onSyncNow: () => Promise<void>;
}) {
  const { lang, setLang, t } = useI18n();
  const [syncingNow, setSyncingNow] = useState(false);
  const {
    themeMode,
    resolvedScheme,
    liveTheme,
    liveMotion,
    motionSpeed,
    surfaceTone,
    scrimIntensity,
    setThemeMode,
    setLiveTheme,
    setLiveMotion,
    setMotionSpeed,
    setSurfaceTone,
    setScrimIntensity,
  } = useThemeStore();
  const { config: voice, updateConfig, speak, stop: stopSpeaking, speaking } = useSpeech();
  const [avatarPref, setAvatarPref] = useState<AvatarPreference>(() => loadAvatarPreference());
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const previewLevelsRef = useRef<{ input: number; output: number }>({ input: 0, output: 0 });
  const activeAvatarSource = resolveAvatarSource(avatarPref);

  useEffect(() => {
    const onSync = () => setAvatarPref(loadAvatarPreference());
    window.addEventListener(VOICE_AVATAR_SYNC_EVENT, onSync);
    return () => window.removeEventListener(VOICE_AVATAR_SYNC_EVENT, onSync);
  }, []);

  useEffect(() => {
    let rafId = 0;
    const start = performance.now();
    const tick = (now: number) => {
      if (speaking) {
        const sec = (now - start) * 0.001;
        previewLevelsRef.current.output = 0.42 + 0.28 * Math.sin(sec * 12) + 0.14 * Math.cos(sec * 7);
      } else {
        previewLevelsRef.current.output *= 0.85;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [speaking]);

  const handleSelectAvatarPreset = (preset: AvatarPresetId) => {
    setAvatarUploadError(null);
    const next: AvatarPreference = { ...avatarPref, preset };
    setAvatarPref(next);
    saveAvatarPreference(next);
  };

  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAvatarUploadError(null);
    setAvatarUploading(true);
    try {
      const processed = await processCustomFaceUpload(file);
      const next: AvatarPreference = {
        preset: 'custom',
        customImageDataUrl: processed.dataUrl,
        customImageName: file.name,
        customTraits: processed.traits,
      };
      setAvatarPref(next);
      saveAvatarPreference(next);
    } catch (err) {
      setAvatarUploadError(err instanceof Error ? err.message : 'Unable to process photo.');
    } finally {
      setAvatarUploading(false);
    }
  };

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
              const active = themeMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setThemeMode(m.id)}
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
            const active = liveTheme === theme.id;
            const previewGradient =
              resolvedScheme === 'dark' ? theme.darkPreviewGradient : theme.lightPreviewGradient;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => setLiveTheme(theme.id)}
                className={`flex items-center justify-between gap-2.5 p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                  active
                    ? 'theme-accent-active'
                    : 'border-slate-200/80 dark:border-slate-700/70 bg-white/60 dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {theme.previewImage ? (
                    <img
                      src={theme.previewImage}
                      alt={theme.name}
                      className="w-10 h-10 rounded-lg object-cover shrink-0 border border-white/50 dark:border-slate-700"
                    />
                  ) : (
                    <span
                      className="w-10 h-10 rounded-lg shrink-0 border border-white/50 dark:border-slate-700 flex items-center justify-center"
                      style={{ background: previewGradient }}
                    />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {theme.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {theme.subtitle}
                    </div>
                  </div>
                </div>
                {active && <Check className="w-4 h-4 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Live Motion, Speed, Surface Tint, Backdrop Clarity */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200/70 dark:border-slate-800/80">
          <div className="space-y-1.5">
            <span className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
              {t.themeControlAnimationSpeed}
            </span>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/70 bg-white/60 dark:bg-slate-900/60">
              {(['calm', 'normal', 'dynamic'] as MotionSpeed[]).map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setMotionSpeed(spd)}
                  className={`py-1 rounded-lg text-[11px] font-medium capitalize transition-colors cursor-pointer ${
                    motionSpeed === spd
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {spd}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
              {t.themeControlSurfaceColors}
            </span>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/70 bg-white/60 dark:bg-slate-900/60">
              {(['adaptive', 'monochrome'] as SurfaceTone[]).map((tone) => (
                <button
                  key={tone}
                  type="button"
                  onClick={() => setSurfaceTone(tone)}
                  className={`py-1 rounded-lg text-[11px] font-medium capitalize transition-colors cursor-pointer ${
                    surfaceTone === tone
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {tone}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
              {t.themeControlBackdropVisibility}
            </span>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/70 bg-white/60 dark:bg-slate-900/60">
              {(['subtle', 'balanced', 'focus'] as ScrimIntensity[]).map((scrim) => (
                <button
                  key={scrim}
                  type="button"
                  onClick={() => setScrimIntensity(scrim)}
                  className={`py-1 rounded-lg text-[11px] font-medium capitalize transition-colors cursor-pointer ${
                    scrimIntensity === scrim
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {scrim}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 dark:border-slate-800/80">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
            {t.liveMotionLabel}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={liveMotion}
            onClick={() => setLiveMotion(!liveMotion)}
            className={`w-10 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
              liveMotion ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                liveMotion ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </section>

      {/* 3D Hologram Companion & Neural Voice */}
      <section className="p-5 rounded-2xl border theme-surface-glass space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 theme-accent-text" />
              <span>{t.voiceSection} &amp; 3D Companion</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t.voiceSectionHint}</p>
          </div>
          <button
            type="button"
            onClick={onOpenCompanion}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl theme-btn-primary text-xs font-semibold cursor-pointer"
          >
            <AudioLines className="w-3.5 h-3.5" />
            <span>Launch 3D Companion</span>
          </button>
        </div>

        {/* Live 3D Avatar Preview + Preset Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          <div className="lg:col-span-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/80 overflow-hidden flex flex-col">
            <div className="relative h-64 w-full bg-transparent overflow-hidden">
              <LiveVoiceAvatarCanvas
                status={speaking ? 'speaking' : 'idle'}
                voiceName={voice.persona}
                levelsRef={previewLevelsRef}
                avatarSrc={activeAvatarSource.src}
                isPrestyledHologram={activeAvatarSource.isPrestyledHologram}
                avatarPreset={avatarPref.preset}
                customTraits={avatarPref.customTraits}
                isDark={resolvedScheme === 'dark'}
              />
            </div>
            <div className="px-3.5 py-2.5 border-t border-slate-200/70 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>
                Active Voice: <strong className="text-slate-900 dark:text-slate-100">{voice.persona}</strong>
              </span>
              <span>Drag to orbit · Click to nod</span>
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col justify-between gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {AVATAR_PRESETS.map((preset) => {
                const isSelected = avatarPref.preset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectAvatarPreset(preset.id)}
                    className={`rounded-xl border p-2.5 text-left transition-all cursor-pointer flex flex-col gap-2 ${
                      isSelected
                        ? 'theme-accent-active ring-2 ring-[var(--theme-accent-ring)]'
                        : 'border-slate-200/80 dark:border-slate-700/80 bg-white/70 dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="relative h-24 w-full rounded-lg overflow-hidden bg-slate-950">
                      <img
                        src={preset.imageSrc}
                        alt={preset.label}
                        className="w-full h-full object-cover object-top"
                      />
                      {isSelected && (
                        <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full theme-btn-primary flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">
                        {preset.label}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        {preset.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}

              <div
                className={`rounded-xl border p-2.5 text-left transition-all flex flex-col gap-2 ${
                  avatarPref.preset === 'custom'
                    ? 'theme-accent-active ring-2 ring-[var(--theme-accent-ring)]'
                    : 'border-slate-200/80 dark:border-slate-700/80 bg-white/70 dark:bg-slate-900/50'
                }`}
              >
                <button
                  type="button"
                  onClick={() => avatarFileInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="relative h-24 w-full rounded-lg overflow-hidden bg-slate-900/90 border border-dashed border-slate-700 flex flex-col items-center justify-center gap-1 text-slate-300 hover:border-cyan-500/70 transition-colors cursor-pointer"
                >
                  {avatarPref.customImageDataUrl ? (
                    <img
                      src={avatarPref.customImageDataUrl}
                      alt="Custom 3D avatar"
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-cyan-400" />
                      <span className="text-[10px] font-medium">
                        {avatarUploading ? 'Processing...' : 'Upload Portrait'}
                      </span>
                    </>
                  )}
                </button>
                <input
                  ref={avatarFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    Custom Photo
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    Face-matched 3D hologram rig
                  </div>
                </div>
              </div>
            </div>

            {avatarUploadError && (
              <p className="text-xs text-rose-500 dark:text-rose-400">{avatarUploadError}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="space-y-1.5">
                <span className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  {t.voiceLabel}
                </span>
                <select
                  value={voice.persona}
                  onChange={(e) => {
                    const nextPersona = e.target.value as VoicePersona;
                    updateConfig({ persona: nextPersona });
                    saveVoicePreference(nextPersona);
                  }}
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

      {/* Cross-Device Real-Time Sync */}
      <section className="p-5 rounded-2xl border theme-surface-glass space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              {t.syncSectionTitle}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {t.syncSectionHint}
            </p>
          </div>
          <button
            type="button"
            disabled={!syncEnabled || syncingNow}
            onClick={() => {
              setSyncingNow(true);
              void onSyncNow().finally(() => setSyncingNow(false));
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 text-slate-800 dark:text-slate-100 hover:border-sky-500/50 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingNow ? 'animate-spin' : ''}`} />
            <span>{syncingNow ? t.syncSyncing : t.syncNowBtn}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/70 dark:border-slate-800/80">
          <div className="space-y-0.5">
            <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {t.syncEnabledLabel}
            </div>
            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              {lastSyncedAt
                ? `${t.syncLastSynced}: ${new Intl.DateTimeFormat(dateLocale(lang), {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  }).format(lastSyncedAt)}`
                : t.syncNeverSynced}
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={syncEnabled}
            onClick={() => onToggleSync(!syncEnabled)}
            className={`w-10 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
              syncEnabled ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                syncEnabled ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </section>

      {/* About */}
      <section className="p-5 rounded-2xl border theme-surface-glass flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            SupremeAI Studio Monorepo
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {runtimeLabel} · Web + Desktop (Tauri v2) + Android (Kotlin/Compose)
          </p>
        </div>
        <span className="font-mono text-xs text-slate-600 dark:text-slate-300 tabular-nums">
          {format('{label} {ver}', { label: t.versionLabel, ver: __APP_VERSION__ })}
        </span>
      </section>
    </div>
  );
}
