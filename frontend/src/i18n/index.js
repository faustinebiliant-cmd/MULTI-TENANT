// ============================================================
// OSWAGO - i18n configuration
// Code-switched Swahili: technical terms stay English,
// everyday terms translated. Default language: English.
// ============================================================

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import sw from './locales/sw.json';

const STORAGE_KEY = 'appLanguage';
const SUPPORTED_LANGUAGES = ['en', 'sw'];
const DEFAULT_LANGUAGE = 'en';

const getInitialLanguage = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED_LANGUAGES.includes(saved)) return saved;
  } catch {
    // localStorage unavailable, fall through
  }
  return DEFAULT_LANGUAGE;
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      sw: { translation: sw }
    },
    lng: getInitialLanguage(),
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: {
      escapeValue: false // React already escapes
    },
    returnNull: false
  });

export const changeLanguage = (lang) => {
  if (!SUPPORTED_LANGUAGES.includes(lang)) return;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore storage errors
  }
  i18n.changeLanguage(lang);
};

export default i18n;