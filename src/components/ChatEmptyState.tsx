import { ArrowUpRight, Brain, Cpu, Zap } from 'lucide-react';
import { BrandMark } from './BrandMark';
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

  return (
    <div className="w-full max-w-3xl mx-auto px-6 py-10 flex flex-col items-center text-center my-auto">
      <div className="mb-5">
        <BrandMark size={48} />
      </div>

      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight text-slate-900 dark:text-white text-balance">
        {t.emptyGreetingPrefix}{' '}
        <span className="theme-accent-gradient-text">{userName}?</span>
      </h1>

      {/* Clean unboxed typographic metadata */}
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-3">
        <span className="font-medium text-slate-700 dark:text-slate-200">{activeModel.name}</span>
        <span aria-hidden="true">·</span>
        <span>{activeRole.name}</span>
        <span aria-hidden="true">·</span>
        <span className="theme-accent-text font-medium">SupremeAI Studio Desktop</span>
      </div>

      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
        {t.welcomeCopy}
      </p>

      {/* 3-column hairline capability strip matching supremeai-frontend */}
      <div className="w-full mt-7 pt-5 border-t border-slate-200/80 dark:border-slate-800/80">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-left">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
              <Brain className="w-3.5 h-3.5 text-violet-500 shrink-0" />
              <span>{t.smartHighThinkingTitle}</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              {t.smartHighThinkingDesc}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
              <Cpu className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span>{t.smartModelIntelligenceTitle}</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              {t.smartModelIntelligenceDesc}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
              <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>{t.smartLowLatencyTitle}</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              {t.smartLowLatencyDesc}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Prompts from Active Role Persona */}
      <div className="w-full mt-7 space-y-2.5 text-left">
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
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
      </div>
    </div>
  );
}
