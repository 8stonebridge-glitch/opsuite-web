'use client';

import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth, useUser, useOrganization } from '@clerk/nextjs';
import { useApp } from '@/store/AppContext';
import { clerkRoleToAppRole } from '@/types';
import { resolveClientClerkOrgRole } from '@/lib/clerkClientOrg';

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
  /** The resolved role for this user (from Clerk org membership) */
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
  const { orgId } = useAuth();
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { membership: clerkMembership, isLoaded: organizationLoaded } = useOrganization();
  const { state } = useApp();
  const isPlaywrightTest = process.env.NEXT_PUBLIC_PLAYWRIGHT_TEST === '1';
  type FallbackState = { status: 'idle' | 'loading' | 'done'; user: SessionUser | null };
  const [fallback, setFallback] = useState<FallbackState>({ status: 'idle', user: null });

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
    if (!isPlaywrightTest || !isLoaded || isSignedIn) {
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
  }, [isLoaded, isPlaywrightTest, isSignedIn]);

  const resolvedUser = sessionUser ?? fallback.user;
  const resolvedSignedIn = (isSignedIn ?? false) || !!fallback.user;
  const resolvedLoading =
    !isLoaded ||
    (resolvedSignedIn && !organizationLoaded) ||
    fallback.status === 'loading' ||
    (isPlaywrightTest && !(isSignedIn ?? false) && fallback.status === 'idle');

  // Resolve role from Clerk org membership first, fall back to app state (Convex-derived)
  const clerkRole = resolveClientClerkOrgRole({
    activeOrgId: orgId,
    membershipRole: clerkMembership?.role ?? null,
    organizationMemberships: clerkUser?.organizationMemberships ?? null,
  });
  const stateRole = state.role;
  const resolvedRole: SessionRole = !resolvedSignedIn
    ? null
    : clerkRole
      ? clerkRoleToAppRole(clerkRole)
      : organizationLoaded
        ? (stateRole as SessionRole) || null
        : null;

  const value = useMemo<SessionContext>(
    () => ({
      user: resolvedUser,
      isLoading: resolvedLoading,
      isSignedIn: resolvedSignedIn,
      role: resolvedRole,
      refresh: async () => {},
    }),
    [resolvedUser, resolvedLoading, resolvedSignedIn, resolvedRole],
  );

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export function useSession(): SessionContext {
  return useContext(SessionCtx);
}
