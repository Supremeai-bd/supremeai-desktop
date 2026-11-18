import { useEffect, useRef, useState } from 'react';
import { APP_LANGUAGE_OPTIONS, useI18n } from '../i18n';
import type { AppLanguage } from '../i18n';

type Theme = 'dark' | 'light';

export default function SettingsDialog({
  onClose,
  theme,
  onThemeChange,
}: {
  onClose: () => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}) {
  const { lang, setLang, t } = useI18n();
  const dialogRef = useRef<HTMLElement | null>(null);
  const [langApplied, setLangApplied] = useState<AppLanguage | null>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.querySelector<HTMLElement>('button')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  // Clear the transient "applied" marker once the language actually changed.
  useEffect(() => {
    if (langApplied && langApplied === lang) {
      const timer = window.setTimeout(() => setLangApplied(null), 1600);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [lang, langApplied]);

  return (
    <div
      className="settings-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className="settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t.settingsTitle}
      >
        <header className="settings-header">
          <div>
            <h2>{t.settingsTitle}</h2>
            <p>{t.settingsSubtitle}</p>
          </div>
          <button className="icon-button" type="button" aria-label={t.close} onClick={onClose}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </header>

        <div className="settings-body">
          <section className="settings-section" aria-labelledby="settings-language">
            <div className="settings-section-head">
              <span className="section-label" id="settings-language">{t.languageSection}</span>
              <span className="settings-hint">{t.languageHint}</span>
            </div>
            <div className="settings-options" role="radiogroup" aria-labelledby="settings-language">
              {APP_LANGUAGE_OPTIONS.map((option) => {
                const description = option.id === 'bn' ? t.languageBnDesc : t.languageEnDesc;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={lang === option.id}
                    className={`settings-option ${lang === option.id ? 'settings-option--active' : ''}`}
                    onClick={() => {
                      setLang(option.id);
                      setLangApplied(option.id);
                    }}
                  >
                    <span className="settings-option-badge">{option.badge}</span>
                    <span className="settings-option-copy">
                      <strong>{option.label}</strong>
                      <small>{description}</small>
                    </span>
                    {lang === option.id && (
                      <span className="settings-option-check" aria-hidden="true">
                        {langApplied === option.id ? '✓' : '●'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="settings-section" aria-labelledby="settings-appearance">
            <div className="settings-section-head">
              <span className="section-label" id="settings-appearance">{t.appearanceSection}</span>
            </div>
            <div className="settings-inline">
              <span className="settings-inline-label">{t.themeLabel}</span>
              <div className="settings-segmented" role="radiogroup" aria-label={t.themeLabel}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={theme === 'dark'}
                  className={`settings-segment ${theme === 'dark' ? 'settings-segment--active' : ''}`}
                  onClick={() => onThemeChange('dark')}
                >
                  {t.themeDarkOption}
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={theme === 'light'}
                  className={`settings-segment ${theme === 'light' ? 'settings-segment--active' : ''}`}
                  onClick={() => onThemeChange('light')}
                >
                  {t.themeLightOption}
                </button>
              </div>
            </div>
          </section>

          <section className="settings-section settings-section--about" aria-labelledby="settings-about">
            <span className="section-label" id="settings-about">{t.aboutSection}</span>
            <div className="settings-about-row">
              <strong>SupremeAI Desktop</strong>
              <span>{t.versionLabel} {__APP_VERSION__}</span>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
