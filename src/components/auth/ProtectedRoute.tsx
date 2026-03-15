'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/providers/SessionProvider';

/**
 * Wraps protected page content. While loading, shows a spinner.
 * If not signed in, redirects to /sign-in.
 *
 * Usage: Wrap children in role layouts (admin/layout.tsx etc.)
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoading, isSignedIn } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isSignedIn) {
      router.replace('/sign-in');
    }
  }, [isLoading, isSignedIn, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-emerald-600 dark:border-gray-700 dark:border-t-emerald-400" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    // Will redirect in useEffect, show nothing while redirecting
    return null;
  }

  return <>{children}</>;
}
