import { motion } from 'motion/react';
import { ArrowUpRight, Brain, Cpu, Zap } from 'lucide-react';
import { BrandMark } from './BrandMark';
import { useThemeStore, LIVE_THEMES } from '../stores/useThemeStore';
import { useI18n } from '../i18n';
import type { ModelOption, RolePersona } from '../types/studio';

interface ChatEmptyStateProps {
  userName: string;
  activeModel: ModelOption;
  activeRole: RolePersona;
  onSelectPrompt: (prompt: string) => void;
}

export function ChatEmptyState({
  userName,
  activeModel,
  activeRole,
  onSelectPrompt,
}: ChatEmptyStateProps) {
  const { t } = useI18n();
  const liveTheme = useThemeStore((s) => s.liveTheme);
  const currentThemeMeta = LIVE_THEMES.find((th) => th.id === liveTheme);
  const isScenic = Boolean(currentThemeMeta?.previewImage);

  return (
    <div className="w-full max-w-3xl mx-auto px-6 py-10 flex flex-col items-center text-center my-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        className="mb-5"
      >
        <BrandMark size={48} />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight chat-theme-text text-balance"
      >
        {t.emptyGreetingPrefix}{' '}
        <span className="theme-accent-gradient-text">{userName}?</span>
      </motion.h1>

      {/* Responsive typographic metadata matching supremeai-frontend */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.14, duration: 0.4 }}
        className={`flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-xs mt-2.5 max-w-full ${
          isScenic
            ? 'px-3 py-1 rounded-xl chat-msg-surface-user chat-theme-text-secondary'
            : 'chat-theme-text-muted'
        }`}
      >
        <span className="font-medium chat-theme-text">{activeModel.name}</span>
        <span aria-hidden="true">·</span>
        <span>{activeRole.name}</span>
        <span aria-hidden="true">·</span>
        <span className="theme-accent-text font-medium">SupremeAI Studio</span>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.18, duration: 0.4 }}
        className="mt-3 text-sm chat-theme-text-muted max-w-xl leading-relaxed"
      >
        {t.welcomeCopy}
      </motion.p>

      {/* 3-column hairline capability strip matching supremeai-frontend */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22, duration: 0.4 }}
        className="w-full max-w-2xl mt-7 pt-5 border-t border-slate-200/60 dark:border-slate-800/70"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-left">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold chat-theme-text">
              <Brain className="w-3.5 h-3.5 text-purple-500 shrink-0" />
              <span>{t.smartHighThinkingTitle}</span>
            </div>
            <p className="text-[11.5px] leading-relaxed chat-theme-text-muted">
              {t.smartHighThinkingDesc}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold chat-theme-text">
              <Cpu className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
              <span>{t.smartModelIntelligenceTitle}</span>
            </div>
            <p className="text-[11.5px] leading-relaxed chat-theme-text-muted">
              {t.smartModelIntelligenceDesc}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold chat-theme-text">
              <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>{t.smartLowLatencyTitle}</span>
            </div>
            <p className="text-[11.5px] leading-relaxed chat-theme-text-muted">
              {t.smartLowLatencyDesc}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Quick Prompts from Active Role Persona */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.42 }}
        className="w-full mt-7 space-y-2.5 text-left"
      >
        <div className="text-xs font-medium chat-theme-text-muted">
          {t.quickPromptsHeading} {activeRole.name}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {activeRole.quickPrompts.slice(0, 4).map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onSelectPrompt(prompt)}
              className="group flex items-start justify-between gap-3 p-3.5 rounded-xl border theme-surface-glass text-left hover:border-sky-500/45 transition-all cursor-pointer"
            >
              <span className="text-xs leading-relaxed text-slate-700 dark:text-slate-200 line-clamp-2">
                {prompt}
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-slate-400 group-hover:text-sky-500 transition-colors mt-0.5" />
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
