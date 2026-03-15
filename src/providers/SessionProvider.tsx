'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  imageUrl: string | null;
}

export interface SessionContext {
  /** The authenticated Clerk user, or null if not signed in */
  user: SessionUser | null;
  /** True while the initial bootstrap fetch is in progress */
  isLoading: boolean;
  /** True if the user has been authenticated */
  isSignedIn: boolean;
  /** Re-fetch session (e.g. after org switch) */
  refresh: () => Promise<void>;
}

const SessionCtx = createContext<SessionContext>({
  user: null,
  isLoading: true,
  isSignedIn: false,
  refresh: async () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/bootstrap');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setIsSignedIn(data.isSignedIn);
      } else {
        setUser(null);
        setIsSignedIn(false);
      }
    } catch {
      setUser(null);
      setIsSignedIn(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSession();
  }, [fetchSession]);

  return (
    <SessionCtx.Provider value={{ user, isLoading, isSignedIn, refresh: fetchSession }}>
      {children}
    </SessionCtx.Provider>
  );
}

export function useSession(): SessionContext {
  return useContext(SessionCtx);
}
