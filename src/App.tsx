import { speakText, generateLocalReply } from './companion/speechHelper';
import HolographicHero from './companion/HolographicHero';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Channel, invoke } from '@tauri-apps/api/core';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AdminDashboard from './admin/AdminDashboard';
import UserSessionPanel from './auth/UserSessionPanel';
import FeedbackWidget from './components/FeedbackWidget';
import LanguageToggle from './components/LanguageToggle';
import SettingsDialog from './components/SettingsDialog';
import { dateLocale, format, useI18n } from './i18n';
import type { Dictionary } from './i18n';

type Role = 'user' | 'assistant';
type IconName = 'chat' | 'folder' | 'search' | 'flask' | 'activity' | 'settings' | 'plus' | 'clock' | 'chevron' | 'send' | 'spark' | 'panel' | 'sun' | 'close';
type ChatMessage = { id: string; role: Role; content: string; state?: 'loading' | 'error'; retryPrompt?: string };
type SavedChat = { id: string; title: string; messages: ChatMessage[]; updatedAt: number };
type ChatResult = { text: string; conversationId?: string };
type Theme = 'dark' | 'light';
type GatewayStatus = 'idle' | 'connected' | 'offline';

const HISTORY_KEY = 'supremeai.desktop.history.v1';
const THEME_KEY = 'supremeai.desktop.theme.v1';
const modeIds = ['auto', 'supremeai/openrouter', 'supremeai/groq'] as const;
const iconPaths: Record<IconName, string> = {
  chat: 'M20 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-4.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 5a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 7 7v.4Z',
  folder: 'M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-10Z',
  search: 'm20 20-4.2-4.2M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z',
  flask: 'M9 3h6m-5 0v6.2l-5.7 9.2A1.7 1.7 0 0 0 7.7 21h8.6a1.7 1.7 0 0 0 1.4-2.6L12 9.2V3m-4.4 12h8.8',
  activity: 'M3 12h4l3-8 4 16 3-8h4',
  settings: 'M12 15.4a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8Zm8-3.4-.9-.5a7.8 7.8 0 0 0-.6-1.5l.5-.9-1.5-1.5-.9.5a7.8 7.8 0 0 0-1.5-.6l-.5-.9h-2.1l-.5.9a7.8 7.8 0 0 0-1.5.6l-.9-.5L6 9.1l.5.9a7.8 7.8 0 0 0-.6 1.5l-.9.5v2.1l.9.5a7.8 7.8 0 0 0 .6 1.5l-.5.9 1.5 1.5.9-.5a7.8 7.8 0 0 0 1.5.6l.5.9h2.1l.5-.9a7.8 7.8 0 0 0 1.5-.6l.9.5 1.5-1.5-.5-.9a7.8 7.8 0 0 0 .6-1.5l.9-.5v-2.1Z',
  plus: 'M12 5v14M5 12h14',
  clock: 'M12 8v4l2.8 1.7M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  chevron: 'm9 18 6-6-6-6',
  send: 'm5 12 14-7-4 14-3-6-7-1Zm7 1 7-8',
  spark: 'm12 3 1.9 5.8L20 11l-6.1 2.1L12 19l-1.9-5.9L4 11l6.1-2.2L12 3Zm7 12 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z',
  panel: 'M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13ZM14 4v16',
  sun: 'M12 3v2m0 14v2m9-9h-2M5 12H3m15.4-6.4-1.4 1.4M7 17l-1.4 1.4m12.8 0L17 17M7 7 5.6 5.6M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  close: 'M18 6 6 18M6 6l12 12',
};

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={iconPaths[name]} /></svg>;
}

function MessageContent({ content, markdown }: { content: string; markdown: boolean }) {
  if (!markdown) return <>{content}</>;
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>;
}

function newId() {
  return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

 function loadChats(fallbackTitle: string): SavedChat[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedChat[];
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.id === 'string' && Array.isArray(item.messages)).map((item) => ({
      id: item.id,
      title: typeof item.title === 'string' && item.title.trim() ? item.title : fallbackTitle,
      updatedAt: typeof item.updatedAt === 'number' && Number.isFinite(item.updatedAt) ? item.updatedAt : Date.now(),
      messages: item.messages.filter((message) => message && (message.role === 'user' || message.role === 'assistant') && typeof message.content === 'string').map((message) => ({
        id: typeof message.id === 'string' ? message.id : newId(),
        role: message.role,
        content: message.content,
        ...(message.state === 'error' ? { state: 'error' as const, retryPrompt: typeof message.retryPrompt === 'string' ? message.retryPrompt : undefined } : {}),
      })),
    })) : [];
  } catch {
    return [];
  }
}

function shortTitle(messages: ChatMessage[], fallback: string) {
  return (messages.find((message) => message.role === 'user')?.content || fallback).replace(/\s+/g, ' ').slice(0, 58);
}

function loadTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function saveChats(chats: SavedChat[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(chats));
    return true;
  } catch {
    return false;
  }
}

function formatAge(timestamp: number, t: Dictionary, language: 'en' | 'bn') {
  const age = Math.max(0, Date.now() - timestamp);
  if (age < 60_000) return t.ageJustNow;
  if (age < 3_600_000) return format(t.ageMinutes, { n: Math.floor(age / 60_000) });
  if (age < 86_400_000) return format(t.ageHours, { n: Math.floor(age / 3_600_000) });
  return new Intl.DateTimeFormat(dateLocale(language), { month: 'short', day: 'numeric' }).format(timestamp);
}

function IconMark() {
  return <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="14.5" stroke="currentColor" strokeWidth="1.5" /><ellipse cx="20" cy="20" rx="7" ry="14.5" stroke="currentColor" strokeWidth="1.1" opacity=".74" /><path d="M5.5 20h29M8.7 11.5h22.6M8.7 28.5h22.6" stroke="currentColor" strokeWidth="1" opacity=".56" /><circle cx="30.8" cy="11.2" r="2.4" fill="#c9f36b" /></svg></span>;
}

export default function App() {
  const { t, lang, setLang } = useI18n();
  const initialChats = useMemo(() => loadChats(t.newConversation), [t.newConversation]);
  const [savedChats, setSavedChats] = useState<SavedChat[]>(initialChats);
  const [conversationId, setConversationId] = useState(() => initialChats[0]?.id ?? newId());
  const [messages, setMessages] = useState<ChatMessage[]>(() => initialChats[0]?.messages ?? []);
  const [query, setQuery] = useState('');
  const [modeId, setModeId] = useState<(typeof modeIds)[number]>('auto');
  const [busy, setBusy] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [commandOpen, setCommandOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [hologramOpen, setHologramOpen] = useState(true);
  const [hologramDocked, setHologramDocked] = useState(false);
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus>('idle');
  const composer = useRef<HTMLTextAreaElement>(null);
  const endOfMessages = useRef<HTMLDivElement>(null);

  const modes = useMemo(() => [
    { label: 'Supreme Auto', id: 'auto' as const, note: t.modeAutoNote },
    { label: 'Reasoning Pro', id: 'supremeai/openrouter' as const, note: t.modeReasoningNote },
    { label: 'Fast Chat', id: 'supremeai/groq' as const, note: t.modeFastNote },
  ], [t]);
  const mode = modes.find((item) => item.id === modeId) ?? modes[0];
  const userMessageCount = messages.filter((message) => message.role === 'user').length;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      setNotice(t.themePrefSaveFailed);
    }
  }, [theme, t.themePrefSaveFailed]);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCommandOpen(false);
        return;
      }
      const modifier = event.metaKey || event.ctrlKey;
      if (!modifier) return;
      if (event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen(true);
      } else if (event.key.toLowerCase() === 'n') {
        event.preventDefault();
        startNewChat();
      } else if (event.key === ',') {
        event.preventDefault();
        setSettingsOpen(true);
      }
    };
    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    const entry: SavedChat = { id: conversationId, title: shortTitle(messages, t.newConversation), messages, updatedAt: Date.now() };
    const next = [entry, ...loadChats(t.newConversation).filter((item) => item.id !== conversationId)].slice(0, 30);
    try {
      saveChats(next);
      setSavedChats(next);
    } catch {
      setNotice(t.historySaveFailed);
    }
  }, [conversationId, messages, t.newConversation, t.historySaveFailed]);

  useEffect(() => {
    endOfMessages.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  useEffect(() => {
    const element = composer.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 150)}px`;
  }, [draft]);

  const searchTerm = query.trim().toLowerCase();
  const filteredChats = savedChats.filter((chat) => !searchTerm || chat.title.toLowerCase().includes(searchTerm) || chat.messages.some((message) => message.content.toLowerCase().includes(searchTerm)));

  function startNewChat() {
    setConversationId(newId());
    setMessages([]);
    setDraft('');
    setNotice('');
    setCommandOpen(false);
    composer.current?.focus();
  }

  function openChat(chat: SavedChat) {
    setConversationId(chat.id);
    setMessages(chat.messages);
    setNotice('');
    setCommandOpen(false);
  }

  function renameChat(chat: SavedChat) {
    const title = window.prompt(t.renameConversation, chat.title)?.trim();
    if (!title) return;
    const next = savedChats.map((item) => item.id === chat.id ? { ...item, title, updatedAt: Date.now() } : item);
    setSavedChats(next);
    if (!saveChats(next)) setNotice(t.renameSaveFailed);
  }

  function deleteChat(chat: SavedChat) {
    if (!window.confirm(format(t.deleteConfirm, { title: chat.title }))) return;
    const next = savedChats.filter((item) => item.id !== chat.id);
    setSavedChats(next);
    if (!saveChats(next)) setNotice(t.deleteSaveFailed);
    if (chat.id === conversationId) startNewChat();
  }

  function exportChat(chat: SavedChat) {
    const markdown = `# ${chat.title}\n\n${chat.messages.map((message) => `## ${message.role === 'user' ? t.exportUser : t.exportAssistant}\n\n${message.content}`).join('\n\n')}`;
    const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${chat.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'supremeai-chat'}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function copyMessage(message: ChatMessage) {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessageId(message.id);
      window.setTimeout(() => setCopiedMessageId((current) => current === message.id ? null : current), 1600);
    } catch {
      setNotice(t.copyFailed);
    }
  }

  async function sendMessage(raw = draft, retryId?: string) {
    const prompt = raw.trim();
    if (!prompt || busy) return;
    setNotice('');
    setDraft('');
    setBusy(true);
    const userMessage: ChatMessage = { id: newId(), role: 'user', content: prompt };
    const assistantId = retryId ?? newId();
    const placeholder: ChatMessage = { id: assistantId, role: 'assistant', content: '', state: 'loading' };
    const previousMessages = retryId ? messages.filter((message) => message.id !== retryId) : messages;
    const historyMessages = retryId && previousMessages.at(-1)?.role === 'user' && previousMessages.at(-1)?.content === prompt ? previousMessages.slice(0, -1) : previousMessages;
    setMessages([...previousMessages, ...(retryId ? [] : [userMessage]), placeholder]);

    const channel = new Channel<string>();
    channel.onmessage = (token: string) => {
      setMessages((current) => current.map((message) => message.id === assistantId
        ? { ...message, content: message.content + token, state: 'loading' }
        : message));
    };

    try {
      const result = await invoke<ChatResult>('send_chat', {
        request: {
          prompt,
          model: mode.id,
          conversationId,
          history: historyMessages.slice(-10).map(({ role, content }) => ({ role, content })),
        },
        onChunk: channel,
      });
      if (result.conversationId && result.conversationId !== conversationId) setConversationId(result.conversationId);
      setGatewayStatus('connected');
      setMessages((current) => current.map((message) => message.id === assistantId
        ? { ...message, content: result.text || message.content, state: undefined, retryPrompt: undefined }
        : message));
    } catch (error) {
      setGatewayStatus('offline');
      const detail = typeof error === 'string' ? error : error instanceof Error ? error.message : t.unknownConnectionError;
      setMessages((current) => current.map((message) => message.id === assistantId
        ? { ...message, content: t.assistantFailed, state: 'error', retryPrompt: prompt }
        : message));
      setNotice(detail.slice(0, 240));
    } finally {
      setBusy(false);
      window.setTimeout(() => composer.current?.focus(), 0);
    }
  }

  return (
    <div className={`workstation ${sidebarOpen ? '' : 'workstation--compact'}`}>
      <aside className="sidebar" aria-label={t.mainNavigation}>
        <div className="brand-row">
          <IconMark />
          <div className="brand-copy"><span className="brand-name">SUPREME<span>AI</span></span><span className="brand-kicker">{t.appKicker}</span></div>
          <button className="icon-button sidebar-collapse" aria-label={t.collapseSidebar} onClick={() => setSidebarOpen(false)}><Icon name="panel" /></button>
        </div>

        <button className="workspace-switcher" type="button" title={t.personalWorkspace}>
          <span className="workspace-avatar">S</span><span className="workspace-label"><strong>{t.personalWorkspace}</strong><small>{t.guestSession}</small></span><Icon name="chevron" size={15} />
        </button>

        <div className="sidebar-section">
          <span className="section-label">{t.workspaceSection.toUpperCase()}</span>
          <button className="nav-item nav-item--active" onClick={startNewChat}><Icon name="chat" /><span>{t.newChat}</span><kbd>⌘ N</kbd></button>
          <button className="nav-item" onClick={() => document.querySelector<HTMLInputElement>('#history-search')?.focus()}><Icon name="search" /><span>{t.searchChats}</span><kbd>⌘ K</kbd></button>
          <button className="nav-item nav-item--disabled" disabled title={t.projectsPlanned}><Icon name="folder" /><span>{t.projects}</span><span className="nav-soon">{t.soon}</span></button>
          <button className="nav-item nav-item--disabled" disabled title={t.researchNotConnected}><Icon name="flask" /><span>{t.deepResearch}</span><span className="nav-soon">{t.soon}</span></button>
          <button className="nav-item nav-item--disabled" disabled title={t.towerNotConnected}><Icon name="activity" /><span>{t.agentActivity}</span><span className="nav-soon">{t.soon}</span></button>
          <button className="nav-item" onClick={() => setAdminOpen(true)}><Icon name="settings" /><span>{t.adminConsole}</span></button>
        </div>

        <div className="history-head"><span className="section-label">{t.recentChats.toUpperCase()}</span><span className="history-count">{savedChats.length.toString().padStart(2, '0')}</span></div>
        <label className="history-search"><Icon name="search" size={15} /><input id="history-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.filterConversations} /></label>
        <div className="history-list" role="list" aria-label={t.recentChats}>
          {filteredChats.length === 0 ? <p className="history-empty">{searchTerm ? t.noMatchingConversations : t.emptyHistory}</p> : filteredChats.map((chat) => (
            <div key={chat.id} className={`history-item-wrap ${chat.id === conversationId ? 'history-item-wrap--active' : ''}`}>
              <button role="listitem" className={`history-item ${chat.id === conversationId ? 'history-item--active' : ''}`} onClick={() => openChat(chat)} onDoubleClick={() => renameChat(chat)} title={t.doubleClickToRename}>
                <span className="history-title">{chat.title}</span><span className="history-age">{formatAge(chat.updatedAt, t, lang)}</span>
              </button>
              <div className="history-item-actions" aria-label={format(t.actionsFor, { title: chat.title })}><button type="button" aria-label={t.exportConversation} onClick={() => exportChat(chat)}>↓</button><button type="button" aria-label={t.renameConversation} onClick={() => renameChat(chat)}>✎</button><button type="button" aria-label={t.deleteConversation} onClick={() => deleteChat(chat)}>×</button></div>
            </div>
          ))}
        </div>

        <div className="sidebar-bottom">
          <div className="build-card"><span className="build-mark"><Icon name="spark" size={15} /></span><div><strong>{t.buildCardTitle.toUpperCase()}</strong><p>{t.buildCardBody}</p></div></div>
          <div className="sidebar-utility-row">
            <LanguageToggle />
            <button className="utility-button" type="button" onClick={() => setFeedbackOpen(true)} title={t.shareFeedbackBtn}>
              <Icon name="spark" size={14} /><span>{t.shareFeedbackBtn}</span>
            </button>
            <button className="utility-button utility-button--icon" type="button" onClick={() => setSettingsOpen(true)} title={t.settings} aria-label={t.settings}>
              <Icon name="settings" size={14} />
            </button>
          </div>
          <UserSessionPanel />
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-leading">
            {!sidebarOpen && <button className="icon-button" aria-label={t.openSidebar} onClick={() => setSidebarOpen(true)}><Icon name="panel" /></button>}
            <div className="breadcrumb"><span>{t.workspace}</span><span className="crumb-slash">/</span><strong>{messages.length ? shortTitle(messages, t.newConversation) : t.newConversation}</strong></div>
          </div>
          <div className="topbar-actions"><span className={`session-badge session-badge--${gatewayStatus}`}><i /> {gatewayStatus === 'connected' ? t.statusConnected : gatewayStatus === 'offline' ? t.statusOffline : t.statusGuest}</span><button className="icon-button" aria-label={format(t.switchTheme, { theme: theme === 'dark' ? t.themeLight : t.themeDark })} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}><Icon name="sun" /></button><button className="icon-button" aria-label={t.startNewChat} onClick={startNewChat}><Icon name="plus" /></button></div>
        </header>

        <section className={`conversation ${messages.length ? 'conversation--active' : ''}`} aria-label={t.newConversation}>
          {messages.length === 0 ? (
            <div className="welcome-wrap">
              <div className="welcome-orbit"><span className="orbit-ring orbit-ring--outer" /><span className="orbit-ring orbit-ring--inner" /><span className="orbit-core"><IconMark /></span><span className="orbit-signal" /></div>
              <p className="eyebrow"><span className="eyebrow-line" /> {t.welcomeEyebrow} <span className="eyebrow-line" /></p>
              <h1>{t.welcomeTitleLead}<br /><em>{t.welcomeTitleAccent}</em></h1>
              <p className="welcome-copy">{t.welcomeCopy}</p>
              <div className="prompt-grid">
                {[
                  { title: t.promptResearchTitle, text: t.promptResearchText, icon: 'flask' as const },
                  { title: t.promptWriteTitle, text: t.promptWriteText, icon: 'spark' as const },
                  { title: t.promptBuildTitle, text: t.promptBuildText, icon: 'activity' as const },
                ].map((item) => <button key={item.title} className="prompt-card" onClick={() => { setDraft(item.text); composer.current?.focus(); }}><span className="prompt-icon"><Icon name={item.icon} size={17} /></span><span><strong>{item.title}</strong><small>{t.startWithPrompt}</small></span><Icon name="chevron" size={15} /></button>)}
              </div>
            </div>
          ) : (
            <div className="message-list">
              {messages.map((message) => <article key={message.id} className={`message message--${message.role}`}>
                {message.role === 'assistant' && <div className="assistant-mark"><IconMark /></div>}
                <div className="message-body">
                  <div className="message-label">{message.role === 'user' ? t.speakerYou : t.speakerAssistant}{message.state === 'loading' && <span className="thinking-label"><i /> {t.thinking}</span>}</div>
                  {message.state === 'loading' && !message.content ? <div className="loading-line"><span /><span /><span /></div> : <div className={`message-content ${message.state === 'error' ? 'message-content--error' : ''}`}><MessageContent content={message.content} markdown={message.role === 'assistant' && message.state !== 'error'} /></div>}
                  {message.role === 'assistant' && message.state !== 'loading' && message.state !== 'error' && message.content && <div className="message-actions" aria-label={t.responseActions}><button type="button" onClick={() => void copyMessage(message)}>{copiedMessageId === message.id ? t.copied : t.copy}</button><button type="button" onClick={() => void sendMessage(message.retryPrompt ?? messages.find((item) => item.role === 'user')?.content ?? '', message.id)}>{t.regenerate}</button></div>}
                  {message.state === 'error' && message.retryPrompt && <button className="retry-button" onClick={() => void sendMessage(message.retryPrompt, message.id)}>{t.retryRequest} <Icon name="chevron" size={14} /></button>}
                </div>
              </article>)}
              <div ref={endOfMessages} />
            </div>
          )}
        </section>

        <div className="composer-area">
          {notice && <div className="notice" role="status"><span>{notice}</span><button aria-label={t.dismissNotice} onClick={() => setNotice('')}><Icon name="close" size={14} /></button></div>}
          <form className="composer-shell" onSubmit={(event) => { event.preventDefault(); void sendMessage(); }}>
            <div className="composer-topline"><label htmlFor="model-select">{t.modelLabel}</label><select id="model-select" value={mode.id} onChange={(event) => setModeId(event.target.value as (typeof modeIds)[number])}>{modes.map((item) => <option key={item.id} value={item.id}>{item.label} — {item.note}</option>)}</select><span className="composer-hint">{t.gatewayRouted}</span></div>
            <textarea ref={composer} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder={t.askPlaceholder} rows={1} aria-label={t.messageSupremeAI} disabled={busy} />
            <div className="composer-footer"><span className="privacy-note"><span className="privacy-dot" /> {t.privacyNote}</span><button className="send-button" type="submit" disabled={!draft.trim() || busy} aria-label={busy ? t.waitingForSupremeAI : t.sendMessage}>{busy ? <span className="send-spinner" /> : <Icon name="send" size={17} />}<span>{busy ? t.working : t.send}</span><kbd>↵</kbd></button></div>
          </form>
          <p className="composer-disclaimer">{t.disclaimer}</p>
        </div>
      </main>
      {commandOpen && <div className="command-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCommandOpen(false); }}><section className="command-palette" role="dialog" aria-modal="true" aria-label={t.commandPalette}><div className="command-heading"><span>{t.commandPalette}</span><kbd>ESC</kbd></div><button onClick={startNewChat}><Icon name="plus" size={16} /><span><strong>{t.newChat}</strong><small>{t.newChatHint}</small></span><kbd>⌘ N</kbd></button><button onClick={() => { setCommandOpen(false); document.querySelector<HTMLInputElement>('#history-search')?.focus(); }}><Icon name="search" size={16} /><span><strong>{t.searchChats}</strong><small>{t.searchChatsHint}</small></span><kbd>⌘ K</kbd></button><button onClick={() => { setCommandOpen(false); setSettingsOpen(true); }}><Icon name="settings" size={16} /><span><strong>{t.openSettings}</strong><small>{t.openSettingsHint}</small></span><kbd>⌘ ,</kbd></button><button onClick={() => { setCommandOpen(false); setFeedbackOpen(true); }}><Icon name="spark" size={16} /><span><strong>{t.openFeedback}</strong><small>{t.openFeedbackHint}</small></span></button><button onClick={() => { setCommandOpen(false); setLang(lang === 'bn' ? 'en' : 'bn'); }}><Icon name="chat" size={16} /><span><strong>{t.switchLanguageTooltip}</strong><small>{lang === 'bn' ? 'English' : 'বাংলা'}</small></span></button><button onClick={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); setCommandOpen(false); }}><Icon name="sun" size={16} /><span><strong>{t.switchThemeTitle}</strong><small>{format(t.switchThemeHint, { theme: theme === 'dark' ? t.themeLight : t.themeDark })}</small></span></button><button onClick={() => { setSidebarOpen(!sidebarOpen); setCommandOpen(false); }}><Icon name="panel" size={16} /><span><strong>{sidebarOpen ? t.collapseSidebar : t.openSidebar}</strong><small>{t.sidebarVisibilityHint}</small></span></button></section></div>}
      {hologramOpen && (
        <HolographicHero
          isDocked={hologramDocked}
          onToggleDock={() => setHologramDocked(!hologramDocked)}
          onClose={() => setHologramOpen(false)}
          latestReply={messages.filter(m => m.role === 'assistant').slice(-1)[0]?.content}
          onSendPrompt={(p) => void sendMessage(p)}
        />
      )}
      {adminOpen && <AdminDashboard onClose={() => setAdminOpen(false)} />}
      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} theme={theme} onThemeChange={setTheme} />}
      <FeedbackWidget
        totalUserMessages={userMessageCount}
        forceOpen={feedbackOpen}
        onCloseForceOpen={() => setFeedbackOpen(false)}
      />
    </div>
  );
}
