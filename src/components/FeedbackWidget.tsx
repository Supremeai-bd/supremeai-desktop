import { useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useI18n } from '../i18n';

/**
 * Product pulse widget — a port of the web app's `WorkspaceMicroSurvey`
 * (supremeai-frontend/src/components/chat/WorkspaceTipsAndSurvey.tsx) so the
 * desktop asks the same question, at the same moment, with the same wording.
 *
 * Parity notes:
 *  * four ratings (great / good / okay / needs_work) in the same order;
 *  * auto-surfaces after 4 user messages, snoozed for 3 days, submitted
 *    feedback is quiet for 14 days, "don't ask" is permanent;
 *  * submission goes through the native `submit_feedback` command, which posts
 *    the web contract's `{event_type, payload.context}` to
 *    `/api/feedback/ingest` using the signed-in session token.
 */

const SURVEY_STORAGE_KEY = 'supremeai.desktop.survey.v1';
const SUBMIT_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const SNOOZE_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
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
    [t],
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
      // Losing the cooldown marker only means the widget may ask again later.
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
      await invoke('submit_feedback', {
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
    <section className="feedback-widget" aria-label={t.surveyTitle}>
      <header className="feedback-head">
        <span className="feedback-mark" aria-hidden="true">✦</span>
        <div>
          <h3>{t.surveyTitle}</h3>
          <p>{t.surveySubtitle}</p>
        </div>
        <button className="icon-button feedback-close" type="button" aria-label={t.close} onClick={handleSnooze}>
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </header>

      {submittedDone ? (
        <p className="feedback-thanks" role="status"><span aria-hidden="true">✓</span> {t.surveyThanks}</p>
      ) : (
        <form className="feedback-form" onSubmit={handleSubmit}>
          <div className="feedback-ratings" role="radiogroup" aria-label={t.surveySubtitle}>
            {ratingOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={rating === option.id}
                className={`feedback-rating ${rating === option.id ? 'feedback-rating--active' : ''}`}
                onClick={() => setRating(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <textarea
            className="feedback-input"
            rows={2}
            value={suggestion}
            maxLength={2000}
            onChange={(event) => setSuggestion(event.target.value)}
            placeholder={t.surveyPlaceholder}
            aria-label={t.surveyPlaceholder}
          />

          {error && <p className="feedback-error" role="alert">{error}</p>}

          <div className="feedback-actions">
            <div className="feedback-dismiss">
              <button type="button" onClick={handleSnooze}>{t.surveyLater}</button>
              <span aria-hidden="true">·</span>
              <button type="button" onClick={handleNeverAsk}>{t.surveyDontAsk}</button>
            </div>
            <button type="submit" className="feedback-send" disabled={!rating || isSubmitting}>
              {isSubmitting ? t.surveySending : t.surveySend}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
