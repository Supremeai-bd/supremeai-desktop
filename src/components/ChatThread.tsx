import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Check,
  Code2,
  Copy,
  Paperclip,
  RefreshCw,
  RotateCcw,
  Volume2,
  Square,
} from 'lucide-react';
import { BrandMark } from './BrandMark';
import { useI18n } from '../i18n';
import type { ChatMessage } from '../types/studio';

interface ChatThreadProps {
  messages: ChatMessage[];
  searchQuery?: string;
  speaking: boolean;
  onSpeak: (text: string) => void;
  onStopSpeaking: () => void;
  onRegenerate: (message: ChatMessage) => void;
  onRetry: (prompt: string, messageId: string) => void;
  onOpenCodeInDock: (code: string, language: string) => void;
}

function CodeBlock({
  code,
  language,
  onOpenInDock,
}: {
  code: string;
  language: string;
  onOpenInDock: (code: string, language: string) => void;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-700/80 bg-slate-950 text-slate-100">
      <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-slate-900/90 border-b border-slate-800 text-[11px] font-mono text-slate-400">
        <span>{language || 'text'}</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onOpenInDock(code, language || 'text')}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-sans font-medium text-sky-300 hover:bg-sky-500/15 transition-colors cursor-pointer"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>{t.openInDock}</span>
          </button>
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-sans font-medium text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? t.copied : t.copyCode}</span>
          </button>
        </div>
      </div>
      <pre className="p-3.5 overflow-x-auto text-xs font-mono leading-relaxed m-0">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function ChatThread({
  messages,
  searchQuery = '',
  speaking,
  onSpeak,
  onStopSpeaking,
  onRegenerate,
  onRetry,
  onOpenCodeInDock,
}: ChatThreadProps) {
  const { t } = useI18n();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const q = searchQuery.trim().toLowerCase();
  const visibleMessages = q
    ? messages.filter((m) => m.content.toLowerCase().includes(q))
    : messages;

  const copyMessage = async (msg: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopiedId(msg.id);
      window.setTimeout(() => setCopiedId((curr) => (curr === msg.id ? null : curr)), 1500);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-5 py-6 space-y-6">
      {visibleMessages.map((message) => {
        const isUser = message.role === 'user';
        const isLoading = message.state === 'loading';
        const isError = message.state === 'error';

        return (
          <article
            key={message.id}
            className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
          >
            {!isUser && (
              <div className="mt-0.5 shrink-0">
                <BrandMark size={28} />
              </div>
            )}

            <div className={`min-w-0 ${isUser ? 'max-w-[82%]' : 'flex-1 max-w-[92%]'}`}>
              <div
                className={`flex items-center gap-2 mb-1.5 text-[11px] font-medium ${
                  isUser ? 'justify-end text-slate-500 dark:text-slate-400' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {isUser ? t.speakerYou : t.speakerAssistant}
                </span>
                {message.modelId && !isUser && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-[10px]">{message.modelId}</span>
                  </>
                )}
                {isLoading && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="theme-accent-text font-medium">{t.thinking}…</span>
                  </>
                )}
              </div>

              {isUser ? (
                <div
                  className="px-4 py-3 rounded-2xl rounded-tr-md border text-sm leading-relaxed text-slate-900 dark:text-slate-100 whitespace-pre-wrap break-words"
                  style={{
                    backgroundColor: 'var(--theme-user-bg)',
                    borderColor: 'var(--theme-user-border)',
                  }}
                >
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {message.attachments.map((att) => (
                        <span
                          key={att.id}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200"
                        >
                          <Paperclip className="w-3 h-3 theme-accent-text" />
                          <span className="truncate max-w-[160px]">{att.name}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  {message.content}
                </div>
              ) : isLoading && !message.content ? (
                <div className="flex items-center gap-1.5 py-2.5">
                  <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                  <span className="w-2 h-2 rounded-full bg-sky-500/70 animate-pulse" />
                  <span className="w-2 h-2 rounded-full bg-sky-500/40 animate-pulse" />
                </div>
              ) : isError ? (
                <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-sm text-amber-800 dark:text-amber-200 space-y-2">
                  <p className="m-0">{message.content}</p>
                  {message.retryPrompt && (
                    <button
                      type="button"
                      onClick={() => onRetry(message.retryPrompt!, message.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{t.retryRequest}</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="studio-markdown text-slate-800 dark:text-slate-100">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        const codeStr = String(children).replace(/\n$/, '');
                        const isBlock = Boolean(match) || codeStr.includes('\n');
                        if (isBlock) {
                          return (
                            <CodeBlock
                              code={codeStr}
                              language={match?.[1] || 'text'}
                              onOpenInDock={onOpenCodeInDock}
                            />
                          );
                        }
                        return (
                          <code
                            className="px-1.5 py-0.5 rounded-md font-mono text-[0.85em] bg-slate-200/75 dark:bg-slate-800/90 text-sky-700 dark:text-sky-300"
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}

              {!isUser && !isLoading && !isError && message.content && (
                <div
                  className="flex items-center flex-wrap gap-1 mt-2"
                  aria-label={t.responseActions}
                >
                  <button
                    type="button"
                    onClick={() => (speaking ? onStopSpeaking() : onSpeak(message.content))}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/70 transition-colors cursor-pointer"
                  >
                    {speaking ? <Square className="w-3 h-3" /> : <Volume2 className="w-3.5 h-3.5" />}
                    <span>{speaking ? t.stopSpeaking : t.readAloud}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void copyMessage(message)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/70 transition-colors cursor-pointer"
                  >
                    {copiedId === message.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedId === message.id ? t.copied : t.copy}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRegenerate(message)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/70 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{t.regenerate}</span>
                  </button>
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
