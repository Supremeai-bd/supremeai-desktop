import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react';
import {
  ArrowUp,
  BookMarked,
  Check,
  ChevronDown,
  Mic,
  MicOff,
  Paperclip,
  Sparkles,
  Square,
  X,
} from 'lucide-react';
import { STUDIO_MODELS } from '../data/studioData';
import { PromptLibraryModal } from './user/PromptLibraryModal';
import { useI18n } from '../i18n';
import type { ChatAttachment, ModelOption, RolePersona } from '../types/studio';

interface ChatInputProps {
  draft: string;
  onDraftChange: (value: string) => void;
  busy: boolean;
  activeModel: ModelOption;
  onSelectModel: (model: ModelOption) => void;
  activeRole: RolePersona;
  activeKnowledgeCount: number;
  notice?: string;
  onDismissNotice?: () => void;
  onSend: (text: string, attachments?: ChatAttachment[]) => void;
  onStop?: () => void;
  onToggleHologram: () => void;
  hologramOpen: boolean;
}

export function ChatInput({
  draft,
  onDraftChange,
  busy,
  activeModel,
  onSelectModel,
  activeRole,
  activeKnowledgeCount,
  notice,
  onDismissNotice,
  onSend,
  onStop,
  onToggleHologram,
  hologramOpen,
}: ChatInputProps) {
  const { t, lang } = useI18n();
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [promptMenuOpen, setPromptMenuOpen] = useState(false);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuWrapRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [draft]);

  useEffect(() => {
    if (!modelMenuOpen && !promptMenuOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (menuWrapRef.current && !menuWrapRef.current.contains(e.target as Node)) {
        setModelMenuOpen(false);
        setPromptMenuOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModelMenuOpen(false);
        setPromptMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, [modelMenuOpen, promptMenuOpen]);

  const processFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const next: ChatAttachment[] = [];
    for (const file of Array.from(fileList).slice(0, 4)) {
      const id = `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      let previewText: string | undefined;
      if (
        file.type.startsWith('text/') ||
        /\.(ts|tsx|js|jsx|json|md|rs|py|css|html|toml|yml|yaml)$/i.test(file.name)
      ) {
        try {
          previewText = (await file.text()).slice(0, 6000);
        } catch {
          // Skip unreadable text
        }
      }
      next.push({
        id,
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        previewText,
      });
    }
    setAttachments((prev) => [...prev, ...next].slice(0, 4));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    void processFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    void processFiles(e.dataTransfer.files);
  };

  const toggleDictation = () => {
    if (isDictating) {
      recognitionRef.current?.stop();
      setIsDictating(false);
      return;
    }
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition;
    if (!SpeechRec) return;

    const rec = new SpeechRec();
    rec.lang = lang === 'bn' ? 'bn-BD' : 'en-US';
    rec.interimResults = false;
    rec.continuous = false;
    rec.onstart = () => setIsDictating(true);
    rec.onresult = (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => {
      const spoken = Array.from(event.results)
        .map((r) => r[0]?.transcript || '')
        .join(' ')
        .trim();
      if (spoken) {
        onDraftChange(draft ? `${draft} ${spoken}` : spoken);
      }
    };
    rec.onend = () => setIsDictating(false);
    rec.onerror = () => setIsDictating(false);
    recognitionRef.current = rec;
    rec.start();
  };

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    const text = draft.trim();
    if ((!text && attachments.length === 0) || busy) return;
    onSend(text || `Inspect attached file(s): ${attachments.map((a) => a.name).join(', ')}`, attachments);
    setAttachments([]);
  };

  return (
    <div
      ref={menuWrapRef}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className="w-full max-w-3xl mx-auto px-5 pb-4 pt-2 shrink-0"
    >
      {notice && (
        <div
          role="status"
          className="mb-2.5 flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-200"
        >
          <span className="truncate">{notice}</span>
          {onDismissNotice && (
            <button
              type="button"
              onClick={onDismissNotice}
              aria-label={t.dismissNotice}
              className="p-1 rounded-md hover:bg-amber-500/20 cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className={`relative rounded-2xl border theme-input-surface theme-capsule-focus transition-all ${
          isDragging ? 'ring-2 ring-sky-500 border-sky-500' : ''
        }`}
      >
        {/* Attached files strip */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-3.5 pt-3">
            {attachments.map((att) => (
              <span
                key={att.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200"
              >
                <Paperclip className="w-3 h-3 theme-accent-text" />
                <span className="truncate max-w-[160px]">{att.name}</span>
                <button
                  type="button"
                  onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                  aria-label={`Remove ${att.name}`}
                  className="text-slate-400 hover:text-rose-500 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={t.askPlaceholder}
          aria-label={t.messageSupremeAI}
          rows={1}
          disabled={busy}
          className="w-full px-4 pt-3.5 pb-2 bg-transparent border-0 outline-none resize-none text-sm leading-relaxed text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />

        {/* Composer action bar */}
        <div className="flex items-center justify-between gap-2 px-3 pb-2.5 pt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Model selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setModelMenuOpen((v) => !v);
                  setPromptMenuOpen(false);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border border-slate-200/80 dark:border-slate-700/75 bg-white/75 dark:bg-slate-800/75 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer whitespace-nowrap"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: activeModel.accentHex }}
                />
                <span>{activeModel.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {modelMenuOpen && (
                <div className="absolute left-0 bottom-full mb-2 w-72 rounded-2xl border theme-surface-strong p-1.5 z-40 space-y-0.5">
                  {STUDIO_MODELS.map((model) => {
                    const selected = model.id === activeModel.id;
                    return (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => {
                          onSelectModel(model);
                          setModelMenuOpen(false);
                        }}
                        className={`w-full flex items-start justify-between gap-2.5 px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                          selected
                            ? 'theme-accent-active border'
                            : 'border border-transparent hover:bg-slate-100/80 dark:hover:bg-slate-800/70'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: model.accentHex }}
                            />
                            <span>{model.name}</span>
                            <span className="text-[10px] font-mono text-slate-400">{model.speed}</span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                            {model.description}
                          </p>
                        </div>
                        {selected && <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Attach file */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title={t.attachFiles}
              aria-label={t.attachFiles}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/70 transition-colors cursor-pointer"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Prompt Library Modal Trigger */}
            <button
              type="button"
              onClick={() => {
                setPromptMenuOpen(true);
                setModelMenuOpen(false);
              }}
              title={t.promptLibrary}
              aria-label={t.promptLibrary}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/70 transition-colors cursor-pointer"
            >
              <BookMarked className="w-4 h-4" />
            </button>

            {/* Active role & RAG metadata (clean unboxed text) */}
            <span className="hidden sm:inline-flex items-center gap-1.5 pl-1 text-[11px] text-slate-500 dark:text-slate-400">
              <span>{activeRole.name}</span>
              {activeKnowledgeCount > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    {activeKnowledgeCount} RAG
                  </span>
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={toggleDictation}
              title={isDictating ? t.stopDictation : t.voiceDictation}
              aria-label={isDictating ? t.stopDictation : t.voiceDictation}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isDictating
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/70'
              }`}
            >
              {isDictating ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onToggleHologram}
              title={t.hologramBtn}
              aria-label={t.hologramBtn}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                hologramOpen
                  ? 'theme-accent-active border'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/70'
              }`}
            >
              <Sparkles className="w-4 h-4" />
            </button>

            {busy && onStop ? (
              <button
                type="button"
                onClick={onStop}
                aria-label={t.stopGenerating}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>{t.stopGenerating}</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={(!draft.trim() && attachments.length === 0) || busy}
                aria-label={busy ? t.waitingForSupremeAI : t.sendMessage}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold theme-btn-primary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ArrowUp className="w-4 h-4" />
                <span>{t.send}</span>
              </button>
            )}
          </div>
        </div>
      </form>

      <div className="mt-2 flex items-center justify-between gap-4 px-1 text-[11px] chat-theme-text-muted">
        <span>{t.privacyNote}</span>
        <span className="hidden sm:inline truncate">{t.disclaimer}</span>
      </div>

      <PromptLibraryModal
        isOpen={promptMenuOpen}
        onClose={() => setPromptMenuOpen(false)}
        onSelectTemplate={(templateText) => {
          onDraftChange(templateText);
          setPromptMenuOpen(false);
          textareaRef.current?.focus();
        }}
        developerMode
      />
    </div>
  );
}
