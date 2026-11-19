import { AppLanguage } from '../types';
import { useAppPreferencesStore } from '../stores/useAppPreferencesStore';

export const APP_LANGUAGE_OPTIONS: Array<{
  id: AppLanguage;
  label: string;
  nativeLabel: string;
  description: string;
  badge: string;
}> = [
  {
    id: 'en',
    label: 'English',
    nativeLabel: 'English',
    description: 'Interface and AI chat/voice replies default to English.',
    badge: 'EN',
  },
  {
    id: 'bn',
    label: 'Bangla (Bengali)',
    nativeLabel: 'বাংলা',
    description: 'ইন্টারফেস এবং AI চ্যাট ও ভয়েস উত্তর ডিফল্টভাবে বাংলায় থাকবে।',
    badge: 'বাং',
  },
];

import { EN_DICT } from '../locales/en';
import type { TranslationKeys } from '../locales/en';
import { BN_DICT } from '../locales/bn';

export type { TranslationKeys };
export { EN_DICT } from '../locales/en';
export { BN_DICT } from '../locales/bn';

export const TRANSLATIONS: Record<AppLanguage, Record<TranslationKeys, string>> = {
  en: EN_DICT,
  bn: BN_DICT,
};

export function getTranslation(lang?: AppLanguage): Record<TranslationKeys, string> {
  return TRANSLATIONS[lang === 'bn' ? 'bn' : 'en'];
}

export function useI18n() {
  const language = useAppPreferencesStore((s) => s.language || 'en');
  const setLanguage = useAppPreferencesStore((s) => s.setLanguage);
  return {
    lang: language,
    setLanguage,
    t: getTranslation(language),
  };
}
