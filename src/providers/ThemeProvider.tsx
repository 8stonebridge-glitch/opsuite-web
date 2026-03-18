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
  // Always start with 'system'/'light' on server + first client render to avoid hydration mismatch.
  // The real preference is applied in useEffect after mount.
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  // Hydrate from localStorage after mount — safe, runs only on client
  useEffect(() => {
    const savedPref = getSavedPreference();
    const savedScheme = resolveScheme(savedPref);
    setPreference(savedPref);
    setColorScheme(savedScheme);
    setMounted(true);
  }, []);

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

  // Listen for system scheme changes
  useEffect(() => {
    if (!mounted || preference !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setColorScheme(getSystemScheme());
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [preference, mounted]);

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
