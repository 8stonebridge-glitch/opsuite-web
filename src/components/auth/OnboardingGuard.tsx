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
  const { isAuthenticated } = useConvexAuth();
  const activeOrg = useQuery(api.organizations.active, isAuthenticated ? {} : 'skip');
  const router = useRouter();

  useEffect(() => {
    // Check Clerk org first
    if (clerkLoaded && clerkOrg && clerkMembership) {
      const dest = CLERK_ROLE_DASHBOARDS[clerkMembership.role] || '/admin/overview';
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
            : '/admin/overview';
      router.replace(dest);
    }
  }, [clerkLoaded, clerkOrg, clerkMembership, activeOrg, router]);

  // While loading, show nothing
  if (!clerkLoaded || activeOrg === undefined) {
    return null;
  }

  // Org exists — render nothing while redirect kicks in
  if (clerkOrg || activeOrg?.organization) {
    return null;
  }

  // No org — show onboarding
  return <>{children}</>;
}
