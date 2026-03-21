'use client';

import { useEffect } from 'react';
import { useQuery, useConvexAuth } from 'convex/react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/convexApi';

/**
 * Prevents users who already have an active organization from
 * re-entering onboarding. Redirects them to their dashboard.
 *
 * This avoids duplicate org creation when a returning user's
 * sign-in redirect accidentally targets /onboarding.
 */
export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useConvexAuth();
  const activeOrg = useQuery(api.organizations.active, isAuthenticated ? {} : 'skip');
  const router = useRouter();

  useEffect(() => {
    // If user already has an active org, they've already onboarded — skip to dashboard.
    // Route to the role-appropriate dashboard so we don't send subadmins/employees
    // to /admin/overview (which would trigger an extra middleware redirect).
    if (activeOrg?.organization) {
      const role = activeOrg.membership?.role;
      const dest =
        role === 'subadmin'
          ? '/subadmin/overview'
          : role === 'employee'
            ? '/employee/my-day'
            : '/admin/overview';
      router.replace(dest);
    }
  }, [activeOrg, router]);

  // While query is loading, show nothing (brief flash)
  if (activeOrg === undefined) {
    return null;
  }

  // Org exists — render nothing while the redirect from useEffect kicks in
  if (activeOrg?.organization) {
    return null;
  }

  // No org — show onboarding
  return <>{children}</>;
}
