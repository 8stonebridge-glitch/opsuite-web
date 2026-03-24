'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/providers/SessionProvider';

/**
 * Client-side auth fallback. Middleware already blocks unauthenticated
 * requests server-side. While Clerk hydrates on the client, keep a
 * visible loading shell instead of flashing a blank page.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoading, isSignedIn } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const returnTo =
    pathname && pathname !== '/sign-in'
      ? `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ''}`
      : '';

  useEffect(() => {
    if (isLoading || isSignedIn !== false) {
      return;
    }

    const signInUrl = new URL('/sign-in', window.location.origin);
    if (returnTo) {
      signInUrl.searchParams.set('returnTo', returnTo);
    }

    router.replace(`${signInUrl.pathname}${signInUrl.search}`);
  }, [isLoading, isSignedIn, returnTo, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-lg font-semibold text-surface-900 dark:text-surface-100">
            Loading your workspace
          </p>
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-surface-200 border-t-emerald-600 dark:border-surface-700 dark:border-t-emerald-400" />
        </div>
      </div>
    );
  }

  if (isSignedIn === false) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex items-center justify-center px-6" role="status" aria-live="polite">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-lg font-semibold text-surface-900 dark:text-surface-100">
            Redirecting to sign in
          </p>
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-surface-200 border-t-emerald-600 dark:border-surface-700 dark:border-t-emerald-400" />
          <p className="text-sm text-surface-500 dark:text-surface-400">
            This page requires an active session.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
