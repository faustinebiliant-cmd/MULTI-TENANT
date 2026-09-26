// ============================================================
// OSWAGO - Language Switcher
// Small EN / SW toggle. Used in header, login page, sidebar.
// ============================================================

import React from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from './index';
import './LanguageSwitcher.css';

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'sw', label: 'SW' }
];

const LanguageSwitcher = ({ variant = 'default' }) => {
  const { i18n } = useTranslation();
  const current = i18n.language;

  return (
    <div className={`lang-switcher lang-switcher--${variant}`}>
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          className={`lang-switcher-btn ${current === lang.code ? 'active' : ''}`}
          onClick={() => changeLanguage(lang.code)}
          aria-label={lang.code === 'en' ? 'English' : 'Kiswahili'}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;