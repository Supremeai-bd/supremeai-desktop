import { useI18n } from '../i18n';

export default function LanguageToggle() {
  const { lang, setLang, t } = useI18n();

  return (
    <div
      className="inline-flex items-center p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700/70 bg-white/70 dark:bg-slate-800/70"
      role="group"
      aria-label={t.switchLanguageTooltip}
      title={t.switchLanguageTooltip}
    >
      <button
        type="button"
        onClick={() => setLang('en')}
        aria-pressed={lang === 'en'}
        className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
          lang === 'en'
            ? 'theme-btn-primary'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang('bn')}
        aria-pressed={lang === 'bn'}
        className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
          lang === 'bn'
            ? 'theme-btn-primary'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
        }`}
      >
        বাং
      </button>
    </div>
  );
}
