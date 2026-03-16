'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/providers/SessionProvider';
import { Crown } from 'lucide-react';

/**
 * Root page — acts as auth-aware entry point.
 *
 * - Loading: spinner
 * - Signed in: redirect to /admin/overview (all signed-in users are admin for now)
 * - Not signed in: redirect to /sign-in
 */
export default function HomePage() {
  const { isLoading, isSignedIn } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (isSignedIn) {
      router.replace('/admin/overview');
    } else {
      router.replace('/sign-in');
    }
  }, [isLoading, isSignedIn, router]);

  // Always show spinner — this page is a redirect-only entry point
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50/60 via-white to-white dark:from-emerald-950/20 dark:via-gray-950 dark:to-gray-950">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-600/20">
          <Crown className="h-7 w-7 text-white" />
        </div>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    </div>
  );
}
