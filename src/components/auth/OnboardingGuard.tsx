'use client';

import { useEffect } from 'react';
import { useOrganization } from '@clerk/nextjs';
import { useQuery, useConvexAuth } from 'convex/react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/convexApi';

const CLERK_ROLE_DASHBOARDS: Record<string, string> = {
  'org:owner_admin': '/admin/overview',
  'org:subadmin': '/subadmin/overview',
  'org:employee': '/employee/my-day',
};

/**
 * Prevents users who already have an active organization from
 * re-entering onboarding. Checks Clerk org first, falls back to Convex.
 */
export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { organization: clerkOrg, membership: clerkMembership, isLoaded: clerkLoaded } = useOrganization();
  const { isAuthenticated, isLoading: isConvexLoading } = useConvexAuth();
  const activeOrg = useQuery(api.organizations.active, isAuthenticated ? {} : 'skip');
  const router = useRouter();

  useEffect(() => {
    // Check Clerk org first
    if (clerkLoaded && clerkOrg && clerkMembership) {
      const dest = CLERK_ROLE_DASHBOARDS[clerkMembership.role] || '/onboarding';
      router.replace(dest);
      return;
    }

    // Fallback: check Convex org (for users who onboarded before migration)
    if (activeOrg?.organization) {
      const role = activeOrg.membership?.role;
      const dest =
        role === 'subadmin'
          ? '/subadmin/overview'
          : role === 'employee'
            ? '/employee/my-day'
            : role === 'owner_admin'
              ? '/admin/overview'
              : '/onboarding';
      router.replace(dest);
    }
  }, [clerkLoaded, clerkOrg, clerkMembership, activeOrg, router]);

  const isResolvingOnboarding =
    !clerkLoaded ||
    isConvexLoading ||
    (isAuthenticated && activeOrg === undefined);

  if (isResolvingOnboarding) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-lg font-semibold text-surface-900 dark:text-surface-100">
            Loading your onboarding
          </p>
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-surface-200 border-t-emerald-600 dark:border-surface-700 dark:border-t-emerald-400" />
          <p className="text-sm text-surface-500 dark:text-surface-400">
            We&apos;re checking your organization details.
          </p>
        </div>
      </div>
    );
  }

  // Org exists — render nothing while redirect kicks in
  if (clerkOrg || activeOrg?.organization) {
    return null;
  }

  // No org — show onboarding
  return <>{children}</>;
}
