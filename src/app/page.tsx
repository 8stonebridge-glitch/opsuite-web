'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/providers/SessionProvider';
import { useApp } from '@/store/AppContext';

/**
 * Root page — client-side role-aware redirect.
 *
 * 1. Not signed in              -> /sign-in
 * 2. Signed in, no active org   -> /onboarding
 * 3. admin                      -> /admin/overview
 * 4. subadmin                   -> /subadmin/overview
 * 5. employee                   -> /employee/my-day
 */
export default function HomePage() {
  const router = useRouter();
  const { isLoading, isSignedIn } = useSession();
  const { state } = useApp();

  useEffect(() => {
    if (isLoading) return;

    if (!isSignedIn) {
      router.replace('/sign-in');
      return;
    }

    // Wait for ConvexDataBridge to resolve org/role
    if (!state.onboardingComplete) return;

    switch (state.role) {
      case 'subadmin':
        router.replace('/subadmin/overview');
        break;
      case 'employee':
        router.replace('/employee/my-day');
        break;
      case 'admin':
      default:
        router.replace('/admin/overview');
        break;
    }
  }, [isLoading, isSignedIn, state.onboardingComplete, state.role, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-50 dark:bg-surface-950">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-surface-200 border-t-emerald-600 dark:border-surface-700 dark:border-t-emerald-400" />
    </div>
  );
}
