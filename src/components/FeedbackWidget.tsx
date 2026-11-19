import { useEffect, useMemo, useState } from 'react';
import { Check, MessageSquareHeart, X } from 'lucide-react';
import { submitDesktopFeedback } from '../bridge/desktopBridge';
import { useI18n } from '../i18n';

const SURVEY_STORAGE_KEY = 'supremeai.desktop.survey.v1';
const SUBMIT_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;
const SNOOZE_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;
const MIN_USER_MESSAGES = 4;

type SurveyRating = 'great' | 'good' | 'okay' | 'needs_work';

interface SurveyPersistedState {
  lastSubmittedAt?: number;
  lastDismissedAt?: number;
  neverAsk?: boolean;
}

function loadPersisted(): SurveyPersistedState {
  try {
    const raw = localStorage.getItem(SURVEY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SurveyPersistedState;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export default function FeedbackWidget({
  totalUserMessages,
  forceOpen = false,
  onCloseForceOpen,
}: {
  totalUserMessages: number;
  forceOpen?: boolean;
  onCloseForceOpen?: () => void;
}) {
  const { t, lang } = useI18n();
  const [persisted, setPersisted] = useState<SurveyPersistedState>(loadPersisted);
  const [sessionDismissed, setSessionDismissed] = useState(false);
  const [rating, setRating] = useState<SurveyRating | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedDone, setSubmittedDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (forceOpen) {
      setSessionDismissed(false);
      setSubmittedDone(false);
      setError('');
    }
  }, [forceOpen]);

  const ratingOptions = useMemo<{ id: SurveyRating; label: string }[]>(
    () => [
      { id: 'great', label: t.surveyRatingGreat },
      { id: 'good', label: t.surveyRatingGood },
      { id: 'okay', label: t.surveyRatingOkay },
      { id: 'needs_work', label: t.surveyRatingNeedsWork },
    ],
    [t]
  );

  const shouldAutoShow = useMemo(() => {
    if (persisted.neverAsk) return false;
    const now = Date.now();
    if (persisted.lastSubmittedAt && now - persisted.lastSubmittedAt < SUBMIT_COOLDOWN_MS) return false;
    if (persisted.lastDismissedAt && now - persisted.lastDismissedAt < SNOOZE_COOLDOWN_MS) return false;
    return totalUserMessages >= MIN_USER_MESSAGES;
  }, [persisted, totalUserMessages]);

  if (!(forceOpen || (shouldAutoShow && !sessionDismissed))) return null;

  function savePersisted(next: SurveyPersistedState) {
    setPersisted(next);
    try {
      localStorage.setItem(SURVEY_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Best effort
    }
  }

  function close(reset = true) {
    if (reset) onCloseForceOpen?.();
    setError('');
  }

  function handleSnooze() {
    savePersisted({ ...persisted, lastDismissedAt: Date.now() });
    setSessionDismissed(true);
    close();
  }

  function handleNeverAsk() {
    savePersisted({ ...persisted, neverAsk: true, lastDismissedAt: Date.now() });
    setSessionDismissed(true);
    close();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!rating || isSubmitting) return;
    setIsSubmitting(true);
    setError('');
    try {
      await submitDesktopFeedback({
        rating,
        suggestion: suggestion.trim(),
        language: lang,
        appVersion: __APP_VERSION__,
      });
      savePersisted({ ...persisted, lastSubmittedAt: Date.now() });
      setSubmittedDone(true);
      window.setTimeout(() => {
        setSessionDismissed(true);
        close();
      }, 1400);
    } catch (cause) {
      const detail = typeof cause === 'string' ? cause : cause instanceof Error ? cause.message : '';
      setError(detail === 'SIGN_IN_REQUIRED' ? t.feedbackSignInRequired : t.feedbackError);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      className="fixed bottom-5 right-5 z-50 w-88 max-w-[calc(100vw-2rem)] rounded-2xl border theme-surface-strong p-4 space-y-3"
      aria-label={t.surveyTitle}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <span className="w-8 h-8 rounded-xl theme-accent-active border flex items-center justify-center shrink-0">
            <MessageSquareHeart className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t.surveyTitle}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t.surveySubtitle}</p>
          </div>
        </div>
        <button
          type="button"
          aria-label={t.close}
          onClick={handleSnooze}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      {submittedDone ? (
        <div
          role="status"
          className="flex items-center gap-2 py-3 px-3 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-medium"
        >
          <Check className="w-4 h-4 shrink-0" />
          <span>{t.surveyThanks}</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label={t.surveySubtitle}>
            {ratingOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={rating === option.id}
                onClick={() => setRating(option.id)}
                className={`py-2 px-3 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                  rating === option.id
                    ? 'theme-accent-active'
                    : 'border-slate-200/80 dark:border-slate-700/70 bg-white/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <textarea
            rows={2}
            value={suggestion}
            maxLength={2000}
            onChange={(event) => setSuggestion(event.target.value)}
            placeholder={t.surveyPlaceholder}
            aria-label={t.surveyPlaceholder}
            className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 text-slate-900 dark:text-slate-100 resize-none"
          />

          {error && (
            <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <button
                type="button"
                onClick={handleSnooze}
                className="hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                {t.surveyLater}
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={handleNeverAsk}
                className="hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                {t.surveyDontAsk}
              </button>
            </div>
            <button
              type="submit"
              disabled={!rating || isSubmitting}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold theme-btn-primary disabled:opacity-45 cursor-pointer"
            >
              {isSubmitting ? t.surveySending : t.surveySend}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
