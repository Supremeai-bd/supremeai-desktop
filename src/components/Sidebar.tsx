import { useState, type FormEvent, type MouseEvent } from 'react';
import {
  BookOpen,
  Check,
  Download,
  Edit2,
  FolderGit2,
  History,
  MessageSquare,
  MessageSquareHeart,
  PanelLeft,
  Pin,
  Plus,
  Puzzle,
  Search,
  Settings,
  Shield,
  Sparkles,
  Trash2,
} from 'lucide-react';
import UserSessionPanel from '../auth/UserSessionPanel';
import { BrandMark } from './BrandMark';
import LanguageToggle from './LanguageToggle';
import { ThemeControlPopover } from './theme/ThemeControlPopover';
import { useI18n } from '../i18n';
import type {
  ActiveTab,
  RolePersona,
  SavedChat,
} from '../types/studio';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  sessions: SavedChat[];
  activeSessionId: string;
  onSelectSession: (chat: SavedChat) => void;
  onNewChat: () => void;
  onRenameSession: (id: string, title: string) => void;
  onDeleteSession: (id: string) => void;
  onTogglePin: (id: string) => void;
  onExportSession: (chat: SavedChat) => void;
  activeRole: RolePersona;
  projectsCount: number;
  activeKnowledgeCount: number;
  activePluginsCount: number;
  onOpenAdmin: () => void;
  onOpenFeedback: () => void;
  onSessionEmailChange: (email: string | null) => void;
}

export function Sidebar({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onRenameSession,
  onDeleteSession,
  onTogglePin,
  onExportSession,
  activeRole,
  projectsCount,
  activeKnowledgeCount,
  activePluginsCount,
  onOpenAdmin,
  onOpenFeedback,
  onSessionEmailChange,
}: SidebarProps) {
  const { t } = useI18n();
  const [filterQuery, setFilterQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!isOpen) return null;

  const q = filterQuery.trim().toLowerCase();
  const matching = sessions.filter(
    (s) =>
      !q ||
      s.title.toLowerCase().includes(q) ||
      s.messages.some((m) => m.content.toLowerCase().includes(q))
  );
  const pinnedSessions = matching.filter((s) => s.isPinned);
  const recentSessions = matching
    .filter((s) => !s.isPinned)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 20);

  const startEditing = (session: SavedChat, e: MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(null);
    setEditingId(session.id);
    setEditingTitle(session.title);
  };

  const commitRename = (id: string, e?: FormEvent) => {
    e?.preventDefault();
    if (editingTitle.trim()) {
      onRenameSession(id, editingTitle.trim());
    }
    setEditingId(null);
  };

  const renderRow = (session: SavedChat) => {
    const isActive = session.id === activeSessionId && activeTab === 'chat';
    const isDeleting = confirmDeleteId === session.id;

    return (
      <div
        key={session.id}
        onClick={() => {
          onSelectSession(session);
          onSelectTab('chat');
        }}
        className={`group relative flex items-center justify-between gap-1 px-2.5 py-2 rounded-xl text-xs cursor-pointer transition-colors ${
          isActive
            ? 'bg-slate-200/80 dark:bg-slate-800/90 text-slate-900 dark:text-white font-semibold'
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/45 dark:hover:bg-slate-800/55 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {editingId === session.id ? (
            <form
              onSubmit={(e) => commitRename(session.id, e)}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 w-full"
            >
              <input
                type="text"
                autoFocus
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={() => commitRename(session.id)}
                className="w-full px-1.5 py-0.5 rounded-md text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
              />
              <button
                type="submit"
                aria-label="Save title"
                className="p-0.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <span
              className="truncate"
              title={session.title}
              onDoubleClick={(e) => startEditing(session, e)}
            >
              {session.title}
            </span>
          )}
        </div>

        {editingId !== session.id && (
          <div
            onClick={(e) => e.stopPropagation()}
            className={`flex items-center gap-0.5 shrink-0 transition-opacity ${
              isActive || isDeleting
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
            }`}
          >
            {isDeleting ? (
              <button
                type="button"
                onClick={() => {
                  onDeleteSession(session.id);
                  setConfirmDeleteId(null);
                }}
                className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
              >
                {t.deleteConversation}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onTogglePin(session.id)}
                  aria-label={session.isPinned ? t.unpinConversation : t.pinConversation}
                  title={session.isPinned ? t.unpinConversation : t.pinConversation}
                  className={`p-1 rounded-md cursor-pointer ${
                    session.isPinned
                      ? 'text-amber-500'
                      : 'text-slate-400 hover:text-slate-800 dark:hover:text-slate-100'
                  }`}
                >
                  <Pin className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onExportSession(session)}
                  aria-label={t.exportConversation}
                  title={t.exportConversation}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => startEditing(session, e)}
                  aria-label={t.renameConversation}
                  title={t.renameConversation}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(session.id)}
                  aria-label={t.deleteConversation}
                  title={t.deleteConversation}
                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  const navBtnClass = (tab: ActiveTab) =>
    `w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
      activeTab === tab
        ? 'bg-slate-200/75 dark:bg-slate-800/90 text-slate-900 dark:text-white font-semibold'
        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/45 dark:hover:bg-slate-800/55 hover:text-slate-900 dark:hover:text-white'
    }`;

  return (
    <aside
      aria-label={t.mainNavigation}
      className="w-[268px] shrink-0 h-full flex flex-col border-r theme-sidebar-surface select-none z-20"
    >
      {/* Brand header */}
      <div className="flex items-center justify-between gap-2 px-3.5 pt-3.5 pb-2.5">
        <button
          type="button"
          onClick={() => onSelectTab('chat')}
          className="flex items-center gap-2.5 min-w-0 cursor-pointer text-left"
        >
          <BrandMark size={30} />
          <div className="min-w-0">
            <div className="text-sm font-bold tracking-tight text-slate-900 dark:text-white leading-tight whitespace-nowrap">
              SupremeAI <span className="theme-accent-text font-semibold">Studio</span>
            </div>
            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 tracking-wide">
              Desktop v{__APP_VERSION__}
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.collapseSidebar}
          title={t.collapseSidebar}
          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Primary New Chat CTA */}
      <div className="px-3 pb-2.5">
        <button
          type="button"
          onClick={onNewChat}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold theme-btn-primary cursor-pointer"
        >
          <span className="inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>{t.newChat}</span>
          </span>
          <kbd className="font-mono text-[10px] opacity-80">⌘N</kbd>
        </button>
      </div>

      {/* Workspace Navigation */}
      <nav className="px-2.5 space-y-0.5">
        <button
          type="button"
          onClick={() => onSelectTab('chat-history')}
          className={navBtnClass('chat-history')}
        >
          <span className="inline-flex items-center gap-2.5 truncate">
            <History className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
            <span className="truncate">{t.allConversations}</span>
          </span>
          <span className="font-mono tabular-nums text-[11px] text-slate-400">
            {sessions.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('roles')}
          className={navBtnClass('roles')}
        >
          <span className="inline-flex items-center gap-2.5 truncate">
            <Sparkles className="w-4 h-4 text-violet-500 shrink-0" />
            <span className="truncate">{t.rolesAndPersonas}</span>
          </span>
          <span className="text-[11px] text-slate-400 truncate max-w-[78px]">
            {activeRole.name.split(' ')[0]}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('projects')}
          className={navBtnClass('projects')}
        >
          <span className="inline-flex items-center gap-2.5 truncate">
            <FolderGit2 className="w-4 h-4 text-sky-500 shrink-0" />
            <span className="truncate">{t.projects}</span>
          </span>
          <span className="font-mono tabular-nums text-[11px] text-slate-400">
            {projectsCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('knowledge')}
          className={navBtnClass('knowledge')}
        >
          <span className="inline-flex items-center gap-2.5 truncate">
            <BookOpen className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="truncate">{t.knowledgeBase}</span>
          </span>
          <span className="font-mono tabular-nums text-[11px] text-emerald-600 dark:text-emerald-400">
            {activeKnowledgeCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('plugins')}
          className={navBtnClass('plugins')}
        >
          <span className="inline-flex items-center gap-2.5 truncate">
            <Puzzle className="w-4 h-4 text-cyan-500 shrink-0" />
            <span className="truncate">{t.pluginsTools}</span>
          </span>
          <span className="font-mono tabular-nums text-[11px] text-cyan-600 dark:text-cyan-400">
            {activePluginsCount}
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenAdmin}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/45 dark:hover:bg-slate-800/55 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <span className="inline-flex items-center gap-2.5 truncate">
            <Shield className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="truncate">{t.adminConsole}</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('settings')}
          className={navBtnClass('settings')}
        >
          <span className="inline-flex items-center gap-2.5 truncate">
            <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
            <span className="truncate">{t.settings}</span>
          </span>
          <kbd className="font-mono text-[10px] text-slate-400">⌘,</kbd>
        </button>
      </nav>

      {/* Hairline divider */}
      <div className="my-2.5 mx-3.5 border-t border-slate-200/80 dark:border-slate-800/80" />

      {/* Search filter */}
      <div className="px-3 pb-2">
        <label className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/55 text-slate-500 dark:text-slate-400 focus-within:border-sky-500/60">
          <Search className="w-3.5 h-3.5 shrink-0" />
          <input
            id="studio-sidebar-search"
            type="search"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder={t.filterConversations}
            className="w-full min-w-0 bg-transparent border-0 outline-none text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
        </label>
      </div>

      {/* Pinned & Recent conversations */}
      <div className="flex-1 min-h-0 overflow-y-auto studio-scroll px-2.5 pb-2 space-y-3">
        {pinnedSessions.length > 0 && (
          <div className="space-y-0.5">
            <div className="px-2 py-1 flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <Pin className="w-3 h-3 text-amber-500" />
                <span>{t.pinnedChats}</span>
              </span>
              <span className="font-mono tabular-nums">{pinnedSessions.length}</span>
            </div>
            {pinnedSessions.map(renderRow)}
          </div>
        )}

        <div className="space-y-0.5">
          <div className="px-2 py-1 flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3 theme-accent-text" />
              <span>{t.recentChats}</span>
            </span>
            <span className="font-mono tabular-nums">{recentSessions.length}</span>
          </div>
          {recentSessions.length === 0 ? (
            <p className="px-2.5 py-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {q ? t.noMatchingConversations : t.emptyHistory}
            </p>
          ) : (
            recentSessions.map(renderRow)
          )}
        </div>
      </div>

      {/* Footer: Language, Theme Popover, Feedback, User Session */}
      <div className="p-2.5 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2 bg-white/35 dark:bg-slate-950/30">
        <div className="flex items-center justify-between gap-1.5">
          <LanguageToggle />
          <ThemeControlPopover
            compact
            align="left"
            placement="top"
            onOpenSettings={() => onSelectTab('settings')}
          />
          <button
            type="button"
            onClick={onOpenFeedback}
            title={t.shareFeedbackBtn}
            aria-label={t.shareFeedbackBtn}
            className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700/70 bg-white/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <MessageSquareHeart className="w-3.5 h-3.5" />
          </button>
        </div>

        <UserSessionPanel onSessionChange={onSessionEmailChange} />
      </div>
    </aside>
  );
}
