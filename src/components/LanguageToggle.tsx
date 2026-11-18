import { APP_LANGUAGE_OPTIONS, useI18n } from '../i18n';

/**
 * Compact EN | বাং switcher for the sidebar (the full picker with descriptions
 * lives in Settings). Mirrors the language toggle of the web workspace so the
 * same two positions — quick toggle + settings — exist on both surfaces.
 */
export default function LanguageToggle() {
  const { lang, setLang, t } = useI18n();

  return (
    <div className="lang-toggle" role="group" aria-label={t.switchLanguageTooltip} title={t.switchLanguageTooltip}>
      {APP_LANGUAGE_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`lang-toggle-option ${lang === option.id ? 'lang-toggle-option--active' : ''}`}
          aria-pressed={lang === option.id}
          onClick={() => setLang(option.id)}
        >
          {option.badge}
        </button>
      ))}
    </div>
  );
}
