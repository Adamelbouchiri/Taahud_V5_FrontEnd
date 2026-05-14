import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import ar from './dictionaries/ar';
import en from './dictionaries/en';
import zh from './dictionaries/zh';

/* ============================================================
 *  LanguageContext
 *  ----------------------------------------------------------------
 *  Lightweight i18n — no external deps. Exposes:
 *
 *    const { t, lang, setLang, dir } = useTranslation();
 *
 *  `t('a.b.c')` does a nested lookup in the active dictionary.
 *  Missing keys fall back to the same key in Arabic, then to
 *  the key string itself, so the UI never renders `undefined`.
 *
 *  `setLang(code)` flips the language, updates `<html lang>` +
 *  `<html dir>`, and persists the choice to localStorage.
 *
 *  Supported codes: 'ar' (RTL), 'en' (LTR), 'zh' (LTR).
 * ============================================================ */

const DICTIONARIES = { ar, en, zh };

export const LANGUAGES = [
  { code: 'ar', label: 'العربية', short: 'AR', dir: 'rtl' },
  { code: 'en', label: 'English', short: 'EN', dir: 'ltr' },
  { code: 'zh', label: '中文', short: '中文', dir: 'ltr' },
];

const STORAGE_KEY = 'taahud:lang';
const DEFAULT_LANG = 'ar';

const LanguageContext = createContext({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (key) => key,
  dir: 'rtl',
});

function readStoredLang() {
  if (typeof window === 'undefined') return DEFAULT_LANG;
  const stored = window.localStorage?.getItem(STORAGE_KEY);
  return DICTIONARIES[stored] ? stored : DEFAULT_LANG;
}

function lookup(dict, key) {
  if (!dict || !key) return undefined;
  const parts = key.split('.');
  let cur = dict;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in cur) cur = cur[p];
    else return undefined;
  }
  return typeof cur === 'string' ? cur : undefined;
}

function interpolate(str, vars) {
  if (!vars || typeof str !== 'string') return str;
  return str.replace(/\{(\w+)\}/g, (m, name) =>
    name in vars ? String(vars[name]) : m
  );
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readStoredLang);

  const setLang = (code) => {
    if (!DICTIONARIES[code]) return;
    setLangState(code);
    try {
      window.localStorage?.setItem(STORAGE_KEY, code);
    } catch {
      // ignore storage failures (private mode, quota, etc.)
    }
  };

  const dir = useMemo(
    () => LANGUAGES.find((l) => l.code === lang)?.dir || 'rtl',
    [lang]
  );

  // Apply lang + dir to <html> so CSS selectors and screen readers
  // see the right attributes. Cleanup not needed — the root is
  // singleton and persists for the app's lifetime.
  useEffect(() => {
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', dir);
  }, [lang, dir]);

  const t = useMemo(() => {
    const active = DICTIONARIES[lang] || DICTIONARIES[DEFAULT_LANG];
    const fallback = DICTIONARIES[DEFAULT_LANG];
    return function translate(key, vars) {
      const hit = lookup(active, key) ?? lookup(fallback, key) ?? key;
      return interpolate(hit, vars);
    };
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t, dir }), [lang, t, dir]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}
