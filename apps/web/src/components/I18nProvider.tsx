'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Locale = 'en' | 'de' | 'fr';

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key,
});

export function useI18n() {
  return useContext(I18nContext);
}

function deepGet(obj: Record<string, unknown>, path: string): string {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return path;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : path;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [translations, setTranslations] = useState<Record<string, unknown>>({});

  useEffect(() => {
    const saved = localStorage.getItem('mosaic_locale') as Locale | null;
    if (saved && ['en', 'de', 'fr'].includes(saved)) {
      setLocaleState(saved);
    }
  }, []);

  useEffect(() => {
    import(`../i18n/${locale}.json`).then((mod) => {
      setTranslations(mod.default);
    });
  }, [locale]);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('mosaic_locale', newLocale);
  };

  const t = (key: string) => deepGet(translations as Record<string, unknown>, key);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}
