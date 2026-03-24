'use client';

import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useConvexAuth } from 'convex/react';
import { useApp } from '@/store/AppContext';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  imageUrl: string | null;
}

export type SessionRole = 'admin' | 'subadmin' | 'employee' | null;

export interface SessionContext {
  /** The authenticated user, or null if not signed in */
  user: SessionUser | null;
  /** True while the initial bootstrap fetch is in progress */
  isLoading: boolean;
  /** True if the user has been authenticated */
  isSignedIn: boolean;
  /** The resolved role for this user (resolved from Convex membership via ConvexDataBridge) */
  role: SessionRole;
  /** Re-fetch session (e.g. after org switch) */
  refresh: () => Promise<void>;
}

const SessionCtx = createContext<SessionContext>({
  user: null,
  isLoading: true,
  isSignedIn: false,
  role: null,
  refresh: async () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: isConvexLoading } = useConvexAuth();
  const { state } = useApp();
  const isPlaywrightTest = process.env.NEXT_PUBLIC_PLAYWRIGHT_TEST === '1';
  type FallbackState = { status: 'idle' | 'loading' | 'done'; user: SessionUser | null };
  const [fallback, setFallback] = useState<FallbackState>({ status: 'idle', user: null });

  const isLoaded = !isConvexLoading;

  const sessionUser = useMemo<SessionUser | null>(() => {
    if (!isLoaded || !isAuthenticated) return null;
    // With Convex Auth, detailed user info comes from ConvexDataBridge / app state,
    // not from the auth provider directly. Provide a placeholder until data loads.
    return {
      id: 'convex-user',
      email: '',
      name: 'User',
      imageUrl: null,
    };
  }, [isLoaded, isAuthenticated]);

  useEffect(() => {
    if (!isPlaywrightTest || !isLoaded || isAuthenticated) {
      return;
    }

    let cancelled = false;

    void Promise.resolve().then(async () => {
      if (cancelled) return;
      setFallback({ status: 'loading', user: null });
      try {
        const response = await fetch('/api/e2e/session');
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        setFallback({ status: 'done', user: response.ok ? (data?.user ?? null) : null });
      } catch {
        if (!cancelled) setFallback({ status: 'done', user: null });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isPlaywrightTest, isAuthenticated]);

  const resolvedUser = sessionUser ?? fallback.user;
  const resolvedSignedIn = isAuthenticated || !!fallback.user;
  const resolvedLoading =
    !isLoaded ||
    fallback.status === 'loading' ||
    (isPlaywrightTest && !isAuthenticated && fallback.status === 'idle');

  const value = useMemo<SessionContext>(
    () => ({
      user: resolvedUser,
      isLoading: resolvedLoading,
      isSignedIn: resolvedSignedIn,
      role: resolvedSignedIn ? (state.role as SessionRole) : null,
      refresh: async () => {},
    }),
    [resolvedUser, resolvedLoading, resolvedSignedIn, state.role],
  );

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export function useSession(): SessionContext {
  return useContext(SessionCtx);
}
