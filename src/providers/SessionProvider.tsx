'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

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
  /** The resolved role for this user (temporary: always 'admin' for signed-in users) */
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
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [role, setRole] = useState<SessionRole>(null);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/bootstrap');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setIsSignedIn(data.isSignedIn);
        setRole(data.role || null);
      } else {
        setUser(null);
        setIsSignedIn(false);
        setRole(null);
      }
    } catch {
      setUser(null);
      setIsSignedIn(false);
      setRole(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSession();
  }, [fetchSession]);

  return (
    <SessionCtx.Provider value={{ user, isLoading, isSignedIn, role, refresh: fetchSession }}>
      {children}
    </SessionCtx.Provider>
  );
}

export function useSession(): SessionContext {
  return useContext(SessionCtx);
}
