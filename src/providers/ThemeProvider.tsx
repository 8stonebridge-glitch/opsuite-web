'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(getSavedPreference);
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>(() => resolveScheme(getSavedPreference()));

  // Apply class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (colorScheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [colorScheme]);

  // Listen for system scheme changes
  useEffect(() => {
    if (preference !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setColorScheme(getSystemScheme());
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [preference]);

  const toggleTheme = () => {
    const next = colorScheme === 'dark' ? 'light' : 'dark';
    setPreference(next);
    setColorScheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch { /* storage unavailable */ }
  };

  const setTheme = (scheme: ThemePreference) => {
    setPreference(scheme);
    setColorScheme(resolveScheme(scheme));
    try { localStorage.setItem(THEME_KEY, scheme); } catch { /* storage unavailable */ }
  };

  return (
    <ThemeContext.Provider value={{ colorScheme, isDark: colorScheme === 'dark', preference, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
