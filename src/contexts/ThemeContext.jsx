import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

/* ============================================================
 *  ThemeContext
 *  ----------------------------------------------------------------
 *  Light / dark theme provider. Persists choice to localStorage
 *  and toggles a `dark` class on <html> so:
 *
 *    - CSS variables (--bg-canvas, --text-ink, …) flip automatically
 *    - Tailwind's `dark:` variant lights up (with darkMode: 'class')
 *
 *  Default theme is `light`. First-time visitors get light regardless
 *  of OS preference — the brand voice leans that way, and we'd rather
 *  surface the dark toggle as a deliberate user choice.
 *
 *  API:
 *    const { theme, setTheme, toggle, isDark } = useTheme();
 * ============================================================ */

const STORAGE_KEY = 'taahud:theme';
const DEFAULT_THEME = 'light';

const ThemeContext = createContext({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  toggle: () => {},
  isDark: false,
});

function readStored() {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  const stored = window.localStorage?.getItem(STORAGE_KEY);
  return stored === 'dark' || stored === 'light' ? stored : DEFAULT_THEME;
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStored);

  const setTheme = (next) => {
    if (next !== 'dark' && next !== 'light') return;
    setThemeState(next);
    try {
      window.localStorage?.setItem(STORAGE_KEY, next);
    } catch {
      // ignore (private mode / quota)
    }
  };

  const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    root.setAttribute('data-theme', theme);
  }, [theme]);

  const value = useMemo(
    () => ({ theme, setTheme, toggle, isDark: theme === 'dark' }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
