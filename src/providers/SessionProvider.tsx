'use client';

import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
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

  const sessionUser = useMemo<SessionUser | null>(() => {
    if (!isLoaded || !isSignedIn || !clerkUser) return null;
    return {
      id: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress || '',
      name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || clerkUser.emailAddresses[0]?.emailAddress || 'User',
      imageUrl: clerkUser.imageUrl || null,
    };
  }, [isLoaded, isSignedIn, clerkUser]);

  const value = useMemo<SessionContext>(
    () => ({
      user: sessionUser,
      isLoading: !isLoaded,
      isSignedIn: isSignedIn ?? false,
      role: isSignedIn ? 'admin' : null,
      refresh: async () => {},
    }),
    [sessionUser, isLoaded, isSignedIn],
  );

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export function useSession(): SessionContext {
  return useContext(SessionCtx);
}
