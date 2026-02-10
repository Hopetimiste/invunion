import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getTranslation, TranslationKey } from '@/lib/translations';

// Supported languages
export type Language = 'en' | 'fr' | 'de';

// Language to locale mapping for Tink
export const languageToLocale: Record<Language, string> = {
  en: 'en_US',
  fr: 'fr_FR',
  de: 'de_DE',
};

// Language display names
export const languageNames: Record<Language, string> = {
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
};

// Language flag emojis
export const languageFlags: Record<Language, string> = {
  en: '🇬🇧',
  fr: '🇫🇷',
  de: '🇩🇪',
};

interface LanguageContextType {
  language: Language;
  locale: string;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'invunion-language';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    // Load from localStorage or default to English
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (stored === 'en' || stored === 'fr' || stored === 'de')) {
      return stored as Language;
    }
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  };

  const t = useCallback((key: TranslationKey): string => {
    return getTranslation(language, key);
  }, [language]);

  const locale = languageToLocale[language];

  return (
    <LanguageContext.Provider value={{ language, locale, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

