'use client';

import React, { createContext, useCallback, useContext, useEffect, useSyncExternalStore, useState } from 'react';
import { useHydrated } from '@/hooks/useHydrated';

const THEME_KEY = 'opsuite_theme';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  colorScheme: 'light' | 'dark';
  isDark: boolean;
  preference: ThemePreference;
  toggleTheme: () => void;
  setTheme: (scheme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colorScheme: 'light',
  isDark: false,
  preference: 'system',
  toggleTheme: () => {},
  setTheme: () => {},
});

function getSystemScheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveScheme(pref: ThemePreference): 'light' | 'dark' {
  if (pref === 'system') return getSystemScheme();
  return pref;
}

function getSavedPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light' || saved === 'system') return saved;
  } catch { /* private browsing or storage unavailable */ }
  return 'system';
}

// External store for theme preference — avoids setState-in-effect for hydration
const themeListeners = new Set<() => void>();
function emitThemeChange() {
  themeListeners.forEach((l) => l());
}
function subscribeTheme(callback: () => void) {
  themeListeners.add(callback);
  // Also listen for cross-tab storage changes
  window.addEventListener('storage', callback);
  return () => {
    themeListeners.delete(callback);
    window.removeEventListener('storage', callback);
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mounted = useHydrated();

  // useSyncExternalStore reads from localStorage without setState-in-effect
  const preference = useSyncExternalStore(
    subscribeTheme,
    getSavedPreference,
    () => 'system' as ThemePreference,
  );

  // Derive color scheme — re-reads system preference when needed
  const [systemScheme, setSystemScheme] = useState<'light' | 'dark'>('light');
  const colorScheme = preference === 'system' ? (mounted ? systemScheme : 'light') : preference;

  // Apply class to <html>
  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (colorScheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [colorScheme, mounted]);

  // Listen for system scheme changes — initialize via subscriber pattern, not direct setState
  useEffect(() => {
    if (!mounted) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setSystemScheme(getSystemScheme());
    // Defer initialization to avoid synchronous setState in effect body
    const id = setTimeout(handler, 0);
    mq.addEventListener('change', handler);
    return () => {
      clearTimeout(id);
      mq.removeEventListener('change', handler);
    };
  }, [mounted]);

  const toggleTheme = useCallback(() => {
    const next = colorScheme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(THEME_KEY, next); } catch { /* storage unavailable */ }
    emitThemeChange();
  }, [colorScheme]);

  const setTheme = useCallback((scheme: ThemePreference) => {
    try { localStorage.setItem(THEME_KEY, scheme); } catch { /* storage unavailable */ }
    emitThemeChange();
  }, []);

  return (
    <ThemeContext.Provider value={{ colorScheme, isDark: colorScheme === 'dark', preference, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
