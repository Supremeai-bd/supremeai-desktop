import React from 'react';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import type { PendingClarification } from '../../services/intentOrchestrator';

interface IntentClarificationCardProps {
  clarification: PendingClarification;
  onSelectOption: (option: string) => void;
  onSkip: () => void;
  onCancel: () => void;
}

export const IntentClarificationCard: React.FC<IntentClarificationCardProps> = ({
  clarification,
  onSelectOption,
  onSkip,
  onCancel,
}) => {
  const isBn = clarification.language === 'bn';
  const isBanglish = clarification.language === 'banglish';

  const kickerText = isBn
    ? 'সঠিক ফলাফলের জন্য ১টি ছোট প্রশ্ন'
    : isBanglish
      ? 'Sothik result-er jonno 1ti choto proshno'
      : 'Quick clarification to get this right';

  const skipLabel = isBn
    ? 'প্রশ্ন ছাড়াই সরাসরি শুরু করুন'
    : isBanglish
      ? 'Directly shuru koro'
      : 'Skip and proceed directly';

  return (
    <div
      data-testid="intent-clarification-card"
      className="w-full max-w-2xl mx-auto rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 sm:p-5 space-y-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Sparkles className="w-3.5 h-3.5 theme-accent-text shrink-0" />
            <span>{kickerText}</span>
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 leading-snug">
            {clarification.question}
          </h3>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Dismiss clarification"
          className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {clarification.options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onSelectOption(opt)}
            className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/60 hover:border-[var(--theme-accent)] hover:bg-white dark:hover:bg-slate-800 text-left text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 flex items-center justify-between gap-2 transition-colors cursor-pointer"
          >
            <span className="leading-snug">{opt}</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>
        ))}
      </div>

      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
        <span className="text-slate-500 dark:text-slate-400 truncate">
          “{clarification.originalPrompt}”
        </span>
        <button
          type="button"
          onClick={onSkip}
          className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer py-1"
        >
          {skipLabel}
        </button>
      </div>
    </div>
  );
};
