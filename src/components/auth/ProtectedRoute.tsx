'use client';

import { useSession } from '@/providers/SessionProvider';

/**
 * Client-side auth fallback. Middleware already blocks unauthenticated
 * requests server-side, so this component just hides children if
 * the client-side auth state hasn't resolved yet — no spinner needed.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useSession();

  // Middleware already redirects unauthenticated users.
  // Render nothing briefly while Clerk hydrates on the client.
  if (isSignedIn === false) {
    return null;
  }

  return <>{children}</>;
}
