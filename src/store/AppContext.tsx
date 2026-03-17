'use client';

import React, { createContext, useContext, useReducer, type ReactNode } from 'react';
import { appReducer, EMPTY_APP_STATE } from './appReducer';
import type { AppState, AppAction } from './appReducer';

// Re-export so existing imports of AppState/AppAction from AppContext keep working
export type { AppState, AppAction };

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, EMPTY_APP_STATE);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
