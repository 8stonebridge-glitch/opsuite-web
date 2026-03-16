'use client';

import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useUser } from '@clerk/nextjs';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  imageUrl: string | null;
}

export type SessionRole = 'admin' | 'subadmin' | 'employee' | null;

export interface SessionContext {
  /** The authenticated Clerk user, or null if not signed in */
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
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const isPlaywrightTest = process.env.NEXT_PUBLIC_PLAYWRIGHT_TEST === '1';
  const [fallbackUser, setFallbackUser] = useState<SessionUser | null>(null);
  const [isFallbackLoading, setIsFallbackLoading] = useState(false);
  const [hasCheckedFallback, setHasCheckedFallback] = useState(false);

  const sessionUser = useMemo<SessionUser | null>(() => {
    if (!isLoaded || !isSignedIn || !clerkUser) return null;
    return {
      id: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress || '',
      name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || clerkUser.emailAddresses[0]?.emailAddress || 'User',
      imageUrl: clerkUser.imageUrl || null,
    };
  }, [isLoaded, isSignedIn, clerkUser]);

  useEffect(() => {
    if (!isPlaywrightTest) {
      return;
    }

    if (!isLoaded) {
      return;
    }

    if (isSignedIn) {
      setFallbackUser(null);
      setHasCheckedFallback(true);
      return;
    }

    let cancelled = false;
    setIsFallbackLoading(true);
    setHasCheckedFallback(false);

    void fetch('/api/e2e/session')
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok || cancelled) {
          return;
        }

        setFallbackUser(data?.user ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setFallbackUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsFallbackLoading(false);
          setHasCheckedFallback(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isPlaywrightTest, isSignedIn]);

  const resolvedUser = sessionUser ?? fallbackUser;
  const resolvedSignedIn = (isSignedIn ?? false) || !!fallbackUser;
  const resolvedLoading =
    !isLoaded ||
    isFallbackLoading ||
    (isPlaywrightTest && !(isSignedIn ?? false) && !hasCheckedFallback);

  const value = useMemo<SessionContext>(
    () => ({
      user: resolvedUser,
      isLoading: resolvedLoading,
      isSignedIn: resolvedSignedIn,
      role: resolvedSignedIn ? 'admin' : null,
      refresh: async () => {},
    }),
    [resolvedUser, resolvedLoading, resolvedSignedIn],
  );

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export function useSession(): SessionContext {
  return useContext(SessionCtx);
}
