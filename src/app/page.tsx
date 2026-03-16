'use client';

import { useEffect, useState } from 'react';
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
 *
 * Falls back to /admin/overview after 6s if Convex data never resolves,
 * to avoid an infinite spinner.
 */
export default function HomePage() {
  const router = useRouter();
  const { isLoading, isSignedIn } = useSession();
  const { state } = useApp();
  const [timedOut, setTimedOut] = useState(false);

  // Fallback timer: if Convex data never resolves, stop waiting
  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 6000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (!isSignedIn) {
      router.replace('/sign-in');
      return;
    }

    // Wait for ConvexDataBridge to resolve org/role (or timeout)
    if (!state.onboardingComplete && !timedOut) return;

    // If timed out without org data, fall back to admin overview
    // (the dashboard pages handle missing data gracefully)
    if (!state.onboardingComplete && timedOut) {
      console.warn('[HomePage] Convex data did not resolve in 6s, falling back to /admin/overview');
      router.replace('/admin/overview');
      return;
    }

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
  }, [isLoading, isSignedIn, state.onboardingComplete, state.role, timedOut, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-50 dark:bg-surface-950">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-surface-200 border-t-emerald-600 dark:border-surface-700 dark:border-t-emerald-400" />
    </div>
  );
}
