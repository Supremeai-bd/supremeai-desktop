import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  GitFork,
  MoreVertical,
  PanelLeft,
  PanelRight,
  Pin,
  Plus,
  Search,
  Sparkles,
  Square,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import AdminDashboard from './admin/AdminDashboard';
import { LiveVoicePanel } from './companion/LiveVoicePanel';
import { ChatEmptyState } from './components/ChatEmptyState';
import { ChatInput } from './components/ChatInput';
import { ChatThread } from './components/ChatThread';
import { CommandPalette } from './components/CommandPalette';
import FeedbackWidget from './components/FeedbackWidget';
import { Sidebar } from './components/Sidebar';
import {
  ChatHistoryView,
  KnowledgeView,
  ProjectsView,
  RolesView,
  SettingsView,
} from './components/StudioViews';
import { LiveScreenBackdrop } from './components/theme/LiveScreenBackdrop';
import { UserPluginsView } from './components/user/UserPluginsView';
import { WorkspaceDock } from './components/WorkspaceDock';
import { isDesktopTauri, sendDesktopChat } from './bridge/desktopBridge';
import {
  DEFAULT_KNOWLEDGE_DOCS,
  DEFAULT_PROJECTS,
  DEFAULT_WORKSPACE_FILES,
  STUDIO_MODELS,
  SYSTEM_ROLES,
} from './data/studioData';
import { INITIAL_PLUGINS } from './data/userPlugins';
import { useSpeech } from './hooks/useSpeech';
import { useI18n } from './i18n';
import { useThemeStore } from './stores/useThemeStore';
import {
  RealtimeSyncClient,
  loadLastSyncedAt,
  loadSyncEnabled,
  mergeSyncedChats,
  saveSyncEnabled,
  type SyncThemePayload,
} from './sync/realtimeSync';
import type {
  ActiveTab,
  ChatAttachment,
  ChatMessage,
  DesktopProject,
  GatewayStatus,
  KnowledgeDoc,
  ModelOption,
  PluginItem,
  RolePersona,
  SavedChat,
  WorkspaceDockTab,
  WorkspaceFile,
} from './types/studio';

const HISTORY_KEY = 'supremeai.desktop.history.v1';
const ROLES_KEY = 'supremeai.desktop.custom_roles.v1';
const PROJECTS_KEY = 'supremeai.desktop.projects.v1';
const KNOWLEDGE_KEY = 'supremeai.desktop.knowledge.v1';
const PLUGINS_KEY = 'supremeai.desktop.plugins.v1';

function newId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function shortTitle(messages: ChatMessage[], fallback: string) {
  return (messages.find((m) => m.role === 'user')?.content || fallback)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 62);
}

function loadChats(fallbackTitle: string): SavedChat[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedChat[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.id === 'string' && Array.isArray(item.messages))
      .map((item) => ({
        id: item.id,
        title: typeof item.title === 'string' && item.title.trim() ? item.title : fallbackTitle,
        updatedAt:
          typeof item.updatedAt === 'number' && Number.isFinite(item.updatedAt)
            ? item.updatedAt
            : Date.now(),
        createdAt:
          typeof item.createdAt === 'number' && Number.isFinite(item.createdAt)
            ? item.createdAt
            : Date.now(),
        isPinned: Boolean(item.isPinned),
        roleId: item.roleId,
        modelId: item.modelId,
        messages: item.messages
          .filter(
            (m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'
          )
          .map((m) => ({
            id: typeof m.id === 'string' ? m.id : newId('msg'),
            role: m.role,
            content: m.content,
            timestamp: typeof m.timestamp === 'number' ? m.timestamp : Date.now(),
            modelId: m.modelId,
            ...(m.state === 'error'
              ? { state: 'error' as const, retryPrompt: m.retryPrompt }
              : {}),
          })),
      }));
  } catch {
    return [];
  }
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const { t, lang, setLang } = useI18n();
  const {
    speak,
    stop: stopSpeaking,
    speaking,
    config: voiceConfig,
    updateConfig: updateVoiceConfig,
  } = useSpeech();
  const resolvedScheme = useThemeStore((s) => s.resolvedScheme);
  const setThemeMode = useThemeStore((s) => s.setThemeMode);
  const setOsPrefersDark = useThemeStore((s) => s.setOsPrefersDark);
  const setPrefersReducedMotion = useThemeStore((s) => s.setPrefersReducedMotion);

  // Sync OS dark mode & reduced-motion preferences into useThemeStore
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const darkMq = window.matchMedia('(prefers-color-scheme: dark)');
    const motionMq = window.matchMedia('(prefers-reduced-motion: reduce)');

    setOsPrefersDark(darkMq.matches, false);
    setPrefersReducedMotion(motionMq.matches);

    const onDarkChange = (e: MediaQueryListEvent) => setOsPrefersDark(e.matches, true);
    const onMotionChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);

    darkMq.addEventListener('change', onDarkChange);
    motionMq.addEventListener('change', onMotionChange);
    return () => {
      darkMq.removeEventListener('change', onDarkChange);
      motionMq.removeEventListener('change', onMotionChange);
    };
  }, [setOsPrefersDark, setPrefersReducedMotion]);

  const [savedChats, setSavedChats] = useState<SavedChat[]>(() => loadChats(t.newConversation));
  const [conversationId, setConversationId] = useState<string>(() => newId('conv'));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 960 : true
  );
  const [activeModel, setActiveModel] = useState<ModelOption>(STUDIO_MODELS[0]);
  const [customRoles, setCustomRoles] = useState<RolePersona[]>(() =>
    loadJson<RolePersona[]>(ROLES_KEY, [])
  );
  const allRoles = useMemo(() => [...SYSTEM_ROLES, ...customRoles], [customRoles]);
  const [activeRoleId, setActiveRoleId] = useState<string>(SYSTEM_ROLES[0].id);
  const activeRole = useMemo(
    () => allRoles.find((r) => r.id === activeRoleId) ?? SYSTEM_ROLES[0],
    [allRoles, activeRoleId]
  );

  const [projects, setProjects] = useState<DesktopProject[]>(() =>
    loadJson<DesktopProject[]>(PROJECTS_KEY, DEFAULT_PROJECTS)
  );
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDoc[]>(() =>
    loadJson<KnowledgeDoc[]>(KNOWLEDGE_KEY, DEFAULT_KNOWLEDGE_DOCS)
  );
  const [plugins, setPlugins] = useState<PluginItem[]>(() =>
    loadJson<PluginItem[]>(PLUGINS_KEY, INITIAL_PLUGINS)
  );
  const activeKnowledgeDocs = useMemo(
    () => knowledgeDocs.filter((d) => d.enabled),
    [knowledgeDocs]
  );
  const activePluginsCount = useMemo(
    () => plugins.filter((p) => p.isEnabled).length,
    [plugins]
  );

  // Workspace Dock state (Preview / Monaco Code / xterm.js Terminal)
  const [dockOpen, setDockOpen] = useState(false);
  const [dockTab, setDockTab] = useState<WorkspaceDockTab>('preview');
  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFile[]>(DEFAULT_WORKSPACE_FILES);
  const [activeFileId, setActiveFileId] = useState<string>(DEFAULT_WORKSPACE_FILES[0].id);

  // UI overlays & chat controls
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus>('idle');
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [hologramOpen, setHologramOpen] = useState(false);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [syncEnabled, setSyncEnabled] = useState<boolean>(() => loadSyncEnabled());
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(() => loadLastSyncedAt());

  const abortRef = useRef<AbortController | null>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const chatMenuRef = useRef<HTMLDivElement>(null);
  const syncClientRef = useRef<RealtimeSyncClient | null>(null);
  const applyingRemoteSyncRef = useRef(false);

  const runtimeLabel = isDesktopTauri() ? 'Tauri v2 Native Desktop' : 'Desktop Studio Preview';
  const currentChatMeta = useMemo(
    () => savedChats.find((c) => c.id === conversationId),
    [savedChats, conversationId]
  );
  const userMessageCount = messages.filter((m) => m.role === 'user').length;
  const userName = sessionEmail
    ? sessionEmail.split('@')[0].replace(/^\w/, (c) => c.toUpperCase())
    : t.emptyGreetingGuest;

  // Persist chats, roles, projects, knowledge docs
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(savedChats));
    } catch {
      // Ignore storage failure
    }
  }, [savedChats]);

  useEffect(() => {
    try {
      localStorage.setItem(ROLES_KEY, JSON.stringify(customRoles));
    } catch {
      // Ignore storage failure
    }
  }, [customRoles]);

  useEffect(() => {
    try {
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    } catch {
      // Ignore storage failure
    }
  }, [projects]);

  useEffect(() => {
    try {
      localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify(knowledgeDocs));
    } catch {
      // Ignore storage failure
    }
  }, [knowledgeDocs]);

  useEffect(() => {
    try {
      localStorage.setItem(PLUGINS_KEY, JSON.stringify(plugins));
    } catch {
      // Ignore storage failure
    }
    if (syncEnabled && !applyingRemoteSyncRef.current) {
      syncClientRef.current?.publish('plugins', plugins);
    }
  }, [plugins, syncEnabled]);

  // Cross-Device Real-Time Sync engine (Web + Desktop + Android)
  useEffect(() => {
    if (!syncEnabled) {
      syncClientRef.current?.stop();
      syncClientRef.current = null;
      return;
    }

    const client = new RealtimeSyncClient({
      onSyncActivity: (ts) => setLastSyncedAt(ts),
      onEnvelope: (envelope) => {
        applyingRemoteSyncRef.current = true;
        try {
          if (envelope.domain === 'chats' && Array.isArray(envelope.payload)) {
            const incoming = envelope.payload as SavedChat[];
            setSavedChats((prev) => mergeSyncedChats(prev, incoming));
          } else if (envelope.domain === 'roles' && Array.isArray(envelope.payload)) {
            setCustomRoles(envelope.payload as RolePersona[]);
          } else if (envelope.domain === 'knowledge' && Array.isArray(envelope.payload)) {
            setKnowledgeDocs(envelope.payload as KnowledgeDoc[]);
          } else if (envelope.domain === 'plugins' && Array.isArray(envelope.payload)) {
            setPlugins(envelope.payload as PluginItem[]);
          } else if (envelope.domain === 'theme' && envelope.payload && typeof envelope.payload === 'object') {
            useThemeStore.getState().applyRemoteThemeConfig(envelope.payload as SyncThemePayload);
          }
        } finally {
          window.setTimeout(() => {
            applyingRemoteSyncRef.current = false;
          }, 50);
        }
      },
    });
    syncClientRef.current = client;
    client.start();

    const unsubTheme = useThemeStore.subscribe((state, prev) => {
      if (applyingRemoteSyncRef.current) return;
      if (
        state.themeMode !== prev.themeMode ||
        state.liveTheme !== prev.liveTheme ||
        state.liveMotion !== prev.liveMotion ||
        state.motionSpeed !== prev.motionSpeed ||
        state.surfaceTone !== prev.surfaceTone ||
        state.scrimIntensity !== prev.scrimIntensity
      ) {
        client.publish<SyncThemePayload>('theme', {
          themeMode: state.themeMode,
          liveTheme: state.liveTheme,
          liveMotion: state.liveMotion,
          motionSpeed: state.motionSpeed,
          surfaceTone: state.surfaceTone,
          scrimIntensity: state.scrimIntensity,
        });
      }
    });

    return () => {
      unsubTheme();
      client.stop();
      syncClientRef.current = null;
    };
  }, [syncEnabled, sessionEmail]);

  // Publish chats, custom roles, and knowledge changes to sync engine
  useEffect(() => {
    if (!syncEnabled || applyingRemoteSyncRef.current || savedChats.length === 0) return;
    syncClientRef.current?.publish('chats', savedChats);
  }, [savedChats, syncEnabled]);

  useEffect(() => {
    if (!syncEnabled || applyingRemoteSyncRef.current) return;
    syncClientRef.current?.publish('roles', customRoles);
  }, [customRoles, syncEnabled]);

  useEffect(() => {
    if (!syncEnabled || applyingRemoteSyncRef.current) return;
    syncClientRef.current?.publish('knowledge', knowledgeDocs);
  }, [knowledgeDocs, syncEnabled]);

  // Save current conversation updates into history
  useEffect(() => {
    if (messages.length === 0) return;
    setSavedChats((prev) => {
      const existing = prev.find((c) => c.id === conversationId);
      const entry: SavedChat = {
        id: conversationId,
        title: existing?.title || shortTitle(messages, t.newConversation),
        messages,
        updatedAt: Date.now(),
        createdAt: existing?.createdAt ?? Date.now(),
        isPinned: existing?.isPinned ?? false,
        roleId: activeRole.id,
        modelId: activeModel.id,
      };
      return [entry, ...prev.filter((c) => c.id !== conversationId)].slice(0, 40);
    });
  }, [conversationId, messages, t.newConversation, activeRole.id, activeModel.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  // Close chat action menu on outside click
  useEffect(() => {
    if (!chatMenuOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (chatMenuRef.current && !chatMenuRef.current.contains(e.target as Node)) {
        setChatMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [chatMenuOpen]);

  const startNewChat = useCallback(() => {
    abortRef.current?.abort();
    setConversationId(newId('conv'));
    setMessages([]);
    setDraft('');
    setNotice('');
    setChatSearchOpen(false);
    setChatSearchQuery('');
    setActiveTab('chat');
  }, []);

  // Global desktop shortcuts (⌘K, ⌘N, ⌘,)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const modifier = event.metaKey || event.ctrlKey;
      if (!modifier) return;
      if (event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen((v) => !v);
      } else if (event.key.toLowerCase() === 'n') {
        event.preventDefault();
        startNewChat();
      } else if (event.key === ',') {
        event.preventDefault();
        setActiveTab('settings');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [startNewChat]);

  const openChat = (chat: SavedChat) => {
    setConversationId(chat.id);
    setMessages(chat.messages);
    setNotice('');
    setChatSearchOpen(false);
    setChatSearchQuery('');
    setActiveTab('chat');
  };

  const renameChat = (id: string, title: string) => {
    setSavedChats((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title, updatedAt: Date.now() } : c))
    );
  };

  const togglePinChat = (id: string) => {
    setSavedChats((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isPinned: !c.isPinned } : c))
    );
  };

  const deleteChat = (id: string) => {
    setSavedChats((prev) => prev.filter((c) => c.id !== id));
    if (id === conversationId) {
      startNewChat();
    }
  };

  const branchCurrentChat = () => {
    if (messages.length === 0) return;
    const branchedId = newId('conv');
    const title = `${currentChatMeta?.title || shortTitle(messages, t.newConversation)} (Branch)`;
    const branched: SavedChat = {
      id: branchedId,
      title,
      messages: messages.map((m) => ({ ...m, id: newId('msg') })),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isPinned: false,
      roleId: activeRole.id,
      modelId: activeModel.id,
    };
    setSavedChats((prev) => [branched, ...prev]);
    setConversationId(branchedId);
    setMessages(branched.messages);
    setChatMenuOpen(false);
  };

  const exportChat = (chat: SavedChat) => {
    const markdown = `# ${chat.title}\n\n${chat.messages
      .map(
        (m) => `## ${m.role === 'user' ? t.exportUser : t.exportAssistant}\n\n${m.content}`
      )
      .join('\n\n')}`;
    const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${chat.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'supremeai-chat'}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const openCodeInDock = (code: string, language: string) => {
    const ext =
      language === 'html'
        ? 'html'
        : language === 'css'
          ? 'css'
          : language === 'javascript' || language === 'js'
            ? 'js'
            : language === 'python' || language === 'py'
              ? 'py'
              : language === 'json'
                ? 'json'
                : 'ts';
    const fileName = language === 'html' ? 'preview.html' : `snippet-${workspaceFiles.length + 1}.${ext}`;
    setWorkspaceFiles((prev) => {
      const existingHtml = language === 'html' ? prev.find((f) => f.name === 'preview.html') : undefined;
      if (existingHtml) {
        setActiveFileId(existingHtml.id);
        return prev.map((f) => (f.id === existingHtml.id ? { ...f, content: code } : f));
      }
      const created: WorkspaceFile = {
        id: newId('file'),
        name: fileName,
        language: language === 'js' ? 'javascript' : language === 'ts' ? 'typescript' : language,
        content: code,
      };
      setActiveFileId(created.id);
      return [created, ...prev];
    });
    setDockTab(language === 'html' ? 'preview' : 'code');
    setDockOpen(true);
  };

  const createWorkspaceFile = () => {
    const nextFile: WorkspaceFile = {
      id: newId('file'),
      name: `module-${workspaceFiles.length + 1}.ts`,
      language: 'typescript',
      content: `// New SupremeAI Studio Desktop file\nexport function greet(name: string) {\n  return \`Hello, \${name}!\`;\n}\n`,
    };
    setWorkspaceFiles((prev) => [...prev, nextFile]);
    setActiveFileId(nextFile.id);
    setDockTab('code');
    setDockOpen(true);
  };

  const buildSystemInstruction = () => {
    const parts = [activeRole.systemInstruction];
    if (lang === 'bn') {
      parts.push('Respond in clear, natural Bengali (বাংলা) unless the user asks for another language.');
    }
    if (activeKnowledgeDocs.length > 0) {
      parts.push(
        'Workspace Knowledge Base Context:\n' +
          activeKnowledgeDocs
            .map((doc) => `- ${doc.title} (${doc.category}): ${doc.content}`)
            .join('\n')
      );
    }
    return parts.join('\n\n');
  };

  const sendMessage = async (
    rawText = draft,
    attachments?: ChatAttachment[],
    retryId?: string
  ) => {
    const prompt = rawText.trim();
    if (!prompt || busy) return;

    stopSpeaking();
    setNotice('');
    setDraft('');
    setBusy(true);
    setActiveTab('chat');

    // Enrich prompt with attached text snippets when present
    const attachmentContext = (attachments ?? [])
      .filter((a) => a.previewText)
      .map((a) => `\n\n--- Attached file: ${a.name} ---\n${a.previewText}`)
      .join('');
    const effectivePrompt = attachmentContext ? `${prompt}${attachmentContext}` : prompt;

    const userMsg: ChatMessage = {
      id: newId('msg'),
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
      attachments: attachments && attachments.length > 0 ? attachments : undefined,
    };
    const assistantId = retryId ?? newId('msg');
    const placeholder: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      modelId: activeModel.name,
      state: 'loading',
    };

    const prevMessages = retryId ? messages.filter((m) => m.id !== retryId) : messages;
    const historyBase =
      retryId && prevMessages.at(-1)?.role === 'user' && prevMessages.at(-1)?.content === prompt
        ? prevMessages.slice(0, -1)
        : prevMessages;

    setMessages([...prevMessages, ...(retryId ? [] : [userMsg]), placeholder]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await sendDesktopChat({
        prompt: effectivePrompt,
        model: activeModel.gatewayModel,
        conversationId,
        history: historyBase.slice(-10).map(({ role, content }) => ({ role, content })),
        systemInstruction: buildSystemInstruction(),
        signal: controller.signal,
        onChunk: (token) => {
          setMessages((curr) =>
            curr.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + token, state: 'loading' } : m
            )
          );
        },
      });

      if (result.conversationId && result.conversationId !== conversationId) {
        setConversationId(result.conversationId);
      }
      setGatewayStatus('connected');
      setMessages((curr) =>
        curr.map((m) =>
          m.id === assistantId
            ? { ...m, content: result.text || m.content, state: undefined, retryPrompt: undefined }
            : m
        )
      );

      // Auto-load HTML code blocks into Live Preview dock if generated
      const htmlMatch = /```html\s*([\s\S]*?)```/i.exec(result.text || '');
      if (htmlMatch?.[1] && htmlMatch[1].trim().length > 40) {
        openCodeInDock(htmlMatch[1].trim(), 'html');
      }

      if (voiceConfig.autoSpeak && result.text) {
        void speak(result.text, lang);
      }
    } catch (error) {
      if ((error as { name?: string })?.name === 'AbortError') {
        setMessages((curr) =>
          curr.map((m) => (m.id === assistantId ? { ...m, state: undefined } : m))
        );
      } else {
        setGatewayStatus('offline');
        const detail =
          typeof error === 'string'
            ? error
            : error instanceof Error
              ? error.message
              : t.unknownConnectionError;
        setMessages((curr) =>
          curr.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: `${t.assistantFailed} (${detail})`,
                  state: 'error',
                  retryPrompt: prompt,
                }
              : m
          )
        );
        setNotice(detail.slice(0, 220));
      }
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  };

  const stopGenerating = () => {
    abortRef.current?.abort();
    setBusy(false);
  };

  const toggleAutoSpeak = () => {
    const next = !voiceConfig.autoSpeak;
    updateVoiceConfig({ autoSpeak: next });
    if (!next) stopSpeaking();
    else void speak(t.testVoicePhrase, lang);
  };

  const handleChatWithProject = (project: DesktopProject) => {
    startNewChat();
    void sendMessage(
      `Inspect my connected repository "${project.name}" (${project.repoUrl}, branch: ${project.branch}). Summary: ${project.description}. Provide an architecture overview and recommended next engineering milestones.`
    );
  };

  const handleReviewProject = (project: DesktopProject) => {
    startNewChat();
    void sendMessage(
      `Perform a structured code and security review checklist for "${project.name}" (${project.repoUrl}). Highlight TypeScript strictness, IPC/API boundary safety, and performance priorities.`
    );
  };

  const breadcrumbLabel =
    activeTab === 'chat'
      ? messages.length
        ? currentChatMeta?.title || shortTitle(messages, t.newConversation)
        : t.newConversation
      : activeTab === 'chat-history'
        ? t.allConversations
        : activeTab === 'roles'
          ? t.rolesAndPersonas
          : activeTab === 'projects'
            ? t.projects
            : activeTab === 'knowledge'
              ? t.knowledgeBase
              : activeTab === 'plugins'
                ? t.pluginsTools
                : t.settings;

  const latestAssistantReply = messages
    .filter((m) => m.role === 'assistant' && m.state !== 'error')
    .slice(-1)[0]?.content;

  const streamingAssistantText = busy
    ? messages.find((m) => m.role === 'assistant' && m.state === 'loading')?.content ?? ''
    : '';

  return (
    <div className="relative h-full w-full flex overflow-hidden text-slate-900 dark:text-slate-100">
      {/* SupremeAI Frontend Live Screen Animated Scenic & Particle Backdrop */}
      <LiveScreenBackdrop
        isEmpty={activeTab === 'chat' && messages.length === 0}
        isChatView={activeTab === 'chat'}
      />

      <div className="relative z-10 h-full flex shrink-0">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          sessions={savedChats}
          activeSessionId={conversationId}
          onSelectSession={openChat}
          onNewChat={startNewChat}
          onRenameSession={renameChat}
          onDeleteSession={deleteChat}
          onTogglePin={togglePinChat}
          onExportSession={exportChat}
          activeRole={activeRole}
          projectsCount={projects.length}
          activeKnowledgeCount={activeKnowledgeDocs.length}
          activePluginsCount={activePluginsCount}
          onOpenAdmin={() => setAdminOpen(true)}
          onOpenFeedback={() => setFeedbackOpen(true)}
          onSessionEmailChange={setSessionEmail}
        />
      </div>

      {/* Main Studio Shell + Resizable Workspace Dock */}
      <div className="flex-1 min-w-0 h-full flex relative z-10 overflow-hidden">
        <main className="flex-1 min-w-0 h-full flex flex-col relative overflow-hidden">
          {/* Top Header Bar */}
          <header className="h-14 shrink-0 px-4 sm:px-5 flex items-center justify-between gap-4 border-b border-slate-200/75 dark:border-slate-800/80 bg-white/45 dark:bg-slate-950/35 backdrop-blur-md z-10">
            <div className="flex items-center gap-2.5 min-w-0">
              {!sidebarOpen && (
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  aria-label={t.openSidebar}
                  title={t.openSidebar}
                  className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                >
                  <PanelLeft className="w-4 h-4" />
                </button>
              )}
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 min-w-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('chat')}
                  className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {t.workspace}
                </button>
                <span aria-hidden="true">/</span>
                <strong className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[34vw]">
                  {breadcrumbLabel}
                </strong>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Command Palette trigger */}
              <button
                type="button"
                onClick={() => setCommandOpen(true)}
                className="hidden lg:inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{t.commandPalette}</span>
                <kbd className="font-mono text-[10px]">⌘K</kbd>
              </button>

              {/* 3D Companion toggle */}
              <button
                type="button"
                onClick={() => setHologramOpen((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  hologramOpen
                    ? 'theme-accent-active'
                    : 'border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t.hologramBtn}</span>
              </button>

              {/* Workspace Dock toggle */}
              <button
                type="button"
                onClick={() => setDockOpen((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  dockOpen
                    ? 'theme-accent-active'
                    : 'border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <PanelRight className="w-3.5 h-3.5" />
                <span>{dockOpen ? t.closeDock : t.workspaceDock}</span>
              </button>

              {/* Voice auto-speak / stop */}
              <button
                type="button"
                onClick={() => (speaking ? stopSpeaking() : toggleAutoSpeak())}
                title={speaking ? t.stopSpeaking : t.voiceToggleTooltip}
                aria-label={speaking ? t.stopSpeaking : t.voiceToggleTooltip}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  speaking || voiceConfig.autoSpeak
                    ? 'theme-accent-active'
                    : 'border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {speaking ? <Square className="w-3.5 h-3.5" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {/* 3-dot Chat Menu */}
              {activeTab === 'chat' && messages.length > 0 && (
                <div ref={chatMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setChatMenuOpen((v) => !v)}
                    aria-label={t.chatActionsMenu}
                    className="p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {chatMenuOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-52 rounded-2xl border theme-surface-strong p-1.5 z-40 text-xs space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setChatSearchOpen((v) => !v);
                          setChatMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <Search className="w-3.5 h-3.5 theme-accent-text" />
                        <span>{t.searchInChat}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          togglePinChat(conversationId);
                          setChatMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <Pin className="w-3.5 h-3.5 text-amber-500" />
                        <span>
                          {currentChatMeta?.isPinned ? t.unpinConversation : t.pinConversation}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={branchCurrentChat}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <GitFork className="w-3.5 h-3.5 text-violet-500" />
                        <span>{t.branchConversation}</span>
                      </button>
                      {currentChatMeta && (
                        <button
                          type="button"
                          onClick={() => {
                            exportChat(currentChatMeta);
                            setChatMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-sky-500" />
                          <span>{t.exportConversation}</span>
                        </button>
                      )}
                      <div className="my-1 border-t border-slate-200/70 dark:border-slate-800" />
                      <button
                        type="button"
                        onClick={() => {
                          startNewChat();
                          setChatMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t.clearConversation}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Quick New Chat icon when in chat */}
              <button
                type="button"
                onClick={startNewChat}
                title={t.startNewChat}
                aria-label={t.startNewChat}
                className="p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* In-chat search bar */}
          {activeTab === 'chat' && chatSearchOpen && (
            <div className="px-5 py-2 border-b border-slate-200/75 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 flex items-center justify-center">
              <div className="w-full max-w-3xl flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="search"
                  autoFocus
                  value={chatSearchQuery}
                  onChange={(e) => setChatSearchQuery(e.target.value)}
                  placeholder={t.searchInChat}
                  className="flex-1 bg-transparent border-0 outline-none text-xs text-slate-900 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => {
                    setChatSearchQuery('');
                    setChatSearchOpen(false);
                  }}
                  aria-label={t.close}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Active Viewport */}
          {activeTab === 'chat' ? (
            <>
              <section className="flex-1 min-h-0 overflow-y-auto studio-scroll flex flex-col">
                {messages.length === 0 ? (
                  <ChatEmptyState
                    userName={userName}
                    activeModel={activeModel}
                    activeRole={activeRole}
                    onSelectPrompt={(prompt) => {
                      setDraft(prompt);
                    }}
                  />
                ) : (
                  <>
                    <ChatThread
                      messages={messages}
                      searchQuery={chatSearchQuery}
                      speaking={speaking}
                      onSpeak={(text) => void speak(text, lang)}
                      onStopSpeaking={stopSpeaking}
                      onRegenerate={(msg) => {
                        const prevUser =
                          msg.retryPrompt ??
                          messages
                            .slice(0, messages.findIndex((m) => m.id === msg.id))
                            .reverse()
                            .find((m) => m.role === 'user')?.content ??
                          '';
                        if (prevUser) void sendMessage(prevUser, undefined, msg.id);
                      }}
                      onRetry={(prompt, id) => void sendMessage(prompt, undefined, id)}
                      onOpenCodeInDock={openCodeInDock}
                    />
                    <div ref={threadEndRef} />
                  </>
                )}
              </section>

              <ChatInput
                draft={draft}
                onDraftChange={setDraft}
                busy={busy}
                activeModel={activeModel}
                onSelectModel={setActiveModel}
                activeRole={activeRole}
                activeKnowledgeCount={activeKnowledgeDocs.length}
                notice={notice}
                onDismissNotice={() => setNotice('')}
                onSend={(text, atts) => void sendMessage(text, atts)}
                onStop={stopGenerating}
                onToggleHologram={() => setHologramOpen((v) => !v)}
                hologramOpen={hologramOpen}
              />
            </>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto studio-scroll">
              {activeTab === 'chat-history' && (
                <ChatHistoryView
                  sessions={savedChats}
                  onOpenChat={openChat}
                  onTogglePin={togglePinChat}
                  onExportChat={exportChat}
                  onDeleteChat={deleteChat}
                  onNewChat={startNewChat}
                />
              )}

              {activeTab === 'roles' && (
                <RolesView
                  roles={allRoles}
                  activeRoleId={activeRole.id}
                  onSelectRole={(role) => {
                    setActiveRoleId(role.id);
                    const suggested = STUDIO_MODELS.find((m) => m.id === role.suggestedModel);
                    if (suggested) setActiveModel(suggested);
                    setActiveTab('chat');
                  }}
                  onAddRole={(role) => setCustomRoles((prev) => [role, ...prev])}
                  onDeleteRole={(id) => {
                    setCustomRoles((prev) => prev.filter((r) => r.id !== id));
                    if (activeRoleId === id) setActiveRoleId(SYSTEM_ROLES[0].id);
                  }}
                />
              )}

              {activeTab === 'projects' && (
                <ProjectsView
                  projects={projects}
                  onAddProject={(proj) => setProjects((prev) => [proj, ...prev])}
                  onDeleteProject={(id) => setProjects((prev) => prev.filter((p) => p.id !== id))}
                  onChatWithProject={handleChatWithProject}
                  onReviewProject={handleReviewProject}
                />
              )}

              {activeTab === 'knowledge' && (
                <KnowledgeView
                  docs={knowledgeDocs}
                  onAddDoc={(doc) => setKnowledgeDocs((prev) => [doc, ...prev])}
                  onToggleDoc={(id) =>
                    setKnowledgeDocs((prev) =>
                      prev.map((d) => (d.id === id ? { ...d, enabled: !d.enabled } : d))
                    )
                  }
                  onDeleteDoc={(id) =>
                    setKnowledgeDocs((prev) => prev.filter((d) => d.id !== id))
                  }
                />
              )}

              {activeTab === 'plugins' && (
                <UserPluginsView
                  plugins={plugins}
                  onTogglePlugin={(id) =>
                    setPlugins((prev) =>
                      prev.map((p) => (p.id === id ? { ...p, isEnabled: !p.isEnabled } : p))
                    )
                  }
                  onAddCustomPlugin={(item) =>
                    setPlugins((prev) => [{ ...item, id: newId('plugin') }, ...prev])
                  }
                />
              )}

              {activeTab === 'settings' && (
                <SettingsView
                  onOpenCompanion={() => {
                    setHologramOpen(true);
                    setActiveTab('chat');
                  }}
                  runtimeLabel={runtimeLabel}
                  syncEnabled={syncEnabled}
                  lastSyncedAt={lastSyncedAt}
                  onToggleSync={(next) => {
                    setSyncEnabled(next);
                    saveSyncEnabled(next);
                  }}
                  onSyncNow={async () => {
                    const themeState = useThemeStore.getState();
                    await syncClientRef.current?.syncNow({
                      chats: { updatedAt: Date.now(), items: savedChats },
                      theme: {
                        updatedAt: Date.now(),
                        data: {
                          themeMode: themeState.themeMode,
                          liveTheme: themeState.liveTheme,
                          liveMotion: themeState.liveMotion,
                          motionSpeed: themeState.motionSpeed,
                          surfaceTone: themeState.surfaceTone,
                          scrimIntensity: themeState.scrimIntensity,
                        },
                      },
                      roles: { updatedAt: Date.now(), items: customRoles },
                      knowledge: { updatedAt: Date.now(), items: knowledgeDocs },
                      plugins: { updatedAt: Date.now(), items: plugins },
                    });
                  }}
                />
              )}
            </div>
          )}
        </main>

        {/* SupremeAI Frontend 3D Real-time Voice Companion */}
        <LiveVoicePanel
          isOpen={hologramOpen}
          isDark={resolvedScheme === 'dark'}
          voiceName={voiceConfig.persona}
          isSpeaking={speaking}
          isStreaming={busy}
          streamingContent={streamingAssistantText}
          latestAssistantContent={latestAssistantReply || ''}
          onVoiceChange={(persona) => updateVoiceConfig({ persona })}
          onVoiceSpeedChange={(speed) => updateVoiceConfig({ speed })}
          onSpeakLatest={() => {
            const textToRead = latestAssistantReply || t.testVoicePhrase;
            void speak(textToRead, lang);
          }}
          onStopSpeaking={stopSpeaking}
          onClose={() => setHologramOpen(false)}
        />

        {/* Resizable Workspace Dock (Preview / Monaco Code / xterm.js Terminal) */}
        <WorkspaceDock
          isOpen={dockOpen}
          onClose={() => setDockOpen(false)}
          activeTab={dockTab}
          onTabChange={setDockTab}
          files={workspaceFiles}
          activeFileId={activeFileId}
          onSelectFile={setActiveFileId}
          onUpdateFile={(id, content) =>
            setWorkspaceFiles((prev) =>
              prev.map((f) => (f.id === id ? { ...f, content } : f))
            )
          }
          onCreateFile={createWorkspaceFile}
          resolvedScheme={resolvedScheme}
          activeModelName={activeModel.name}
          gatewayStatus={
            gatewayStatus === 'connected'
              ? t.statusConnected
              : gatewayStatus === 'offline'
                ? t.statusOffline
                : t.statusGuest
          }
          runtimeLabel={runtimeLabel}
        />
      </div>

      {/* Command Palette (⌘K) */}
      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        resolvedScheme={resolvedScheme}
        sidebarOpen={sidebarOpen}
        onNewChat={startNewChat}
        onOpenHistory={() => setActiveTab('chat-history')}
        onOpenRoles={() => setActiveTab('roles')}
        onOpenProjects={() => setActiveTab('projects')}
        onOpenKnowledge={() => setActiveTab('knowledge')}
        onOpenSettings={() => setActiveTab('settings')}
        onOpenAdmin={() => setAdminOpen(true)}
        onOpenFeedback={() => setFeedbackOpen(true)}
        onToggleDock={() => setDockOpen((v) => !v)}
        onToggleHologram={() => setHologramOpen((v) => !v)}
        onToggleTheme={() => setThemeMode(resolvedScheme === 'dark' ? 'light' : 'dark')}
        onToggleLanguage={() => setLang(lang === 'bn' ? 'en' : 'bn')}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />

      {/* Admin Control Center */}
      {adminOpen && <AdminDashboard onClose={() => setAdminOpen(false)} />}

      {/* Product Pulse Feedback Widget */}
      <FeedbackWidget
        totalUserMessages={userMessageCount}
        forceOpen={feedbackOpen}
        onCloseForceOpen={() => setFeedbackOpen(false)}
      />
    </div>
  );
}
