import { useEffect, useState } from 'react';
import {
  BookOpen,
  FolderGit2,
  History,
  Languages,
  MessageSquareHeart,
  PanelLeft,
  PanelRight,
  Plus,
  Search,
  Settings,
  Shield,
  Sparkles,
  Sun,
} from 'lucide-react';
import { format, useI18n } from '../i18n';
import type { ResolvedColorScheme } from '../types/studio';

export interface CommandPaletteAction {
  id: string;
  label: string;
  hint: string;
  shortcut?: string;
  icon: typeof Plus;
  onSelect: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  resolvedScheme: ResolvedColorScheme;
  sidebarOpen: boolean;
  onNewChat: () => void;
  onOpenHistory: () => void;
  onOpenRoles: () => void;
  onOpenProjects: () => void;
  onOpenKnowledge: () => void;
  onOpenSettings: () => void;
  onOpenAdmin: () => void;
  onOpenFeedback: () => void;
  onToggleDock: () => void;
  onToggleHologram: () => void;
  onToggleTheme: () => void;
  onToggleLanguage: () => void;
  onToggleSidebar: () => void;
}

export function CommandPalette({
  open,
  onClose,
  resolvedScheme,
  sidebarOpen,
  onNewChat,
  onOpenHistory,
  onOpenRoles,
  onOpenProjects,
  onOpenKnowledge,
  onOpenSettings,
  onOpenAdmin,
  onOpenFeedback,
  onToggleDock,
  onToggleHologram,
  onToggleTheme,
  onToggleLanguage,
  onToggleSidebar,
}: CommandPaletteProps) {
  const { t, lang } = useI18n();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    setQuery('');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const actions: CommandPaletteAction[] = [
    { id: 'new', label: t.newChat, hint: t.newChatHint, shortcut: '⌘N', icon: Plus, onSelect: onNewChat },
    { id: 'history', label: t.allConversations, hint: t.searchChatsHint, icon: History, onSelect: onOpenHistory },
    { id: 'roles', label: t.rolesAndPersonas, hint: t.rolesSubtitle, icon: Sparkles, onSelect: onOpenRoles },
    { id: 'projects', label: t.projects, hint: t.projectsSubtitle, icon: FolderGit2, onSelect: onOpenProjects },
    { id: 'knowledge', label: t.knowledgeBase, hint: t.knowledgeSubtitle, icon: BookOpen, onSelect: onOpenKnowledge },
    { id: 'dock', label: t.workspaceDock, hint: t.toggleDockHint, icon: PanelRight, onSelect: onToggleDock },
    { id: 'holo', label: t.hologramBtn, hint: t.toggleHologramHint, icon: Sparkles, onSelect: onToggleHologram },
    { id: 'admin', label: t.adminConsole, hint: 'Platform health & tenant usage console', icon: Shield, onSelect: onOpenAdmin },
    { id: 'settings', label: t.openSettings, hint: t.openSettingsHint, shortcut: '⌘,', icon: Settings, onSelect: onOpenSettings },
    { id: 'feedback', label: t.openFeedback, hint: t.openFeedbackHint, icon: MessageSquareHeart, onSelect: onOpenFeedback },
    {
      id: 'theme',
      label: t.switchThemeTitle,
      hint: format(t.switchThemeHint, { theme: resolvedScheme === 'dark' ? t.themeLight : t.themeDark }),
      icon: Sun,
      onSelect: onToggleTheme,
    },
    {
      id: 'lang',
      label: t.switchLanguageTooltip,
      hint: lang === 'bn' ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন',
      icon: Languages,
      onSelect: onToggleLanguage,
    },
    {
      id: 'sidebar',
      label: sidebarOpen ? t.collapseSidebar : t.openSidebar,
      hint: t.sidebarVisibilityHint,
      icon: PanelLeft,
      onSelect: onToggleSidebar,
    },
  ];

  const q = query.trim().toLowerCase();
  const visible = actions.filter(
    (a) => !q || a.label.toLowerCase().includes(q) || a.hint.toLowerCase().includes(q)
  );

  return (
    <div
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-slate-950/55 backdrop-blur-xs"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={t.commandPalette}
        className="w-full max-w-lg rounded-2xl border theme-surface-strong overflow-hidden shadow-2xl"
      >
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-200/80 dark:border-slate-800">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.commandPlaceholder}
            className="flex-1 bg-transparent border-0 outline-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
          <kbd className="px-1.5 py-0.5 rounded-md font-mono text-[10px] border border-slate-200 dark:border-slate-700 text-slate-500">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto studio-scroll p-1.5 space-y-0.5">
          {visible.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => {
                  action.onSelect();
                  onClose();
                }}
                className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-slate-100/90 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="w-4 h-4 theme-accent-text shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {action.label}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {action.hint}
                    </div>
                  </div>
                </div>
                {action.shortcut && (
                  <kbd className="px-1.5 py-0.5 rounded-md font-mono text-[10px] border border-slate-200 dark:border-slate-700 text-slate-400 shrink-0">
                    {action.shortcut}
                  </kbd>
                )}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
