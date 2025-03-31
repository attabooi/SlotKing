import React, { useState, useEffect } from 'react';
import { I18nContext, translations, TranslationKey } from '@/lib/i18n';

interface I18nProviderProps {
  children: React.ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  // Initialize language from localStorage or default to 'en'
  const [language, setLanguage] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('language') || 'en';
    }
    return 'en';
  });

  // Save language preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  // Translate function
  const t = (key: string | TranslationKey): string => {
    // Try to get the translation from the current language
    if (language in translations) {
      const langTranslations = translations[language as keyof typeof translations];
      const translation = langTranslations[key as keyof typeof langTranslations];
      if (translation) return translation;
    }
    
    // Fall back to English if current language doesn't have the translation
    const englishTranslation = translations.en[key as keyof typeof translations.en];
    if (englishTranslation) return englishTranslation;
    
    // Return the key as a last resort
    return key as string;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export default I18nProvider;