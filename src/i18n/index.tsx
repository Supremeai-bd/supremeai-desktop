import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { EN_DICT, type TranslationKeys } from './en';
import { BN_DICT } from './bn';

export type AppLanguage = 'en' | 'bn';
export type { TranslationKeys };
export type Dictionary = Record<TranslationKeys, string>;

export const LANG_STORAGE_KEY = 'supremeai.desktop.lang.v1';

/** Same shape as the web app's APP_LANGUAGE_OPTIONS so the pickers match. */
export const APP_LANGUAGE_OPTIONS: Array<{
  id: AppLanguage;
  label: string;
  nativeLabel: string;
  badge: string;
}> = [
  { id: 'en', label: 'English', nativeLabel: 'English', badge: 'EN' },
  { id: 'bn', label: 'বাংলা (Bengali)', nativeLabel: 'বাংলা', badge: 'বাং' },
];

export const TRANSLATIONS: Record<AppLanguage, Dictionary> = {
  en: EN_DICT,
  bn: BN_DICT,
};

export function getTranslation(language?: AppLanguage): Dictionary {
  return TRANSLATIONS[language === 'bn' ? 'bn' : 'en'];
}

/** Replaces `{name}` placeholders, e.g. `format(t.ageMinutes, { n: 5 })`. */
export function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match,
  );
}

/** Locale used for dates/numbers rendered next to translated copy. */
export function dateLocale(language: AppLanguage): string {
  return language === 'bn' ? 'bn-BD' : 'en';
}

export function loadLanguage(): AppLanguage {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    return saved === 'bn' ? 'bn' : 'en';
  } catch {
    return 'en';
  }
}

interface I18nValue {
  lang: AppLanguage;
  setLang: (language: AppLanguage) => void;
  t: Dictionary;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  // Default is English (product default); the choice persists per device.
  const [lang, setLangState] = useState<AppLanguage>(loadLanguage);

  useEffect(() => {
    document.documentElement.lang = lang === 'bn' ? 'bn-BD' : 'en';
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // Language still applies for this session even if the device blocks storage.
    }
  }, [lang]);

  const setLang = useCallback((language: AppLanguage) => setLangState(language), []);
  const value = useMemo<I18nValue>(() => ({ lang, setLang, t: getTranslation(lang) }), [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}
