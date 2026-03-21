'use client';

/**
 * FEAT-AUTH-05: Role-filtered route groups and route-level authorization.
 *
 * After auth resolves, routes the user to the correct role-based dashboard.
 * Does NOT use fuzzy matching. Role must be an exact match from the membership.
 */

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from '@/providers/SessionProvider';

const ROLE_DASHBOARDS: Record<string, string> = {
  owner_admin: '/admin/overview',
  subadmin: '/subadmin/overview',
  employee: '/employee/my-day',
};

const ROLE_PREFIXES: Record<string, string> = {
  owner_admin: '/admin',
  subadmin: '/subadmin',
  employee: '/employee',
};

/** Pages that are role-agnostic — don't redirect from these */
const NEUTRAL_PATHS = ['/onboarding', '/sign-in', '/sign-up'];

/**
 * Hook that redirects the user to their role-appropriate dashboard
 * when they're on a route that doesn't match their resolved role.
 *
 * Only fires once per role resolution to avoid redirect loops.
 */
export function useRoleRouter() {
  const { role, isSignedIn, isLoading } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Wait for auth + role to resolve
    if (isLoading || !isSignedIn || !role) return;

    // Don't redirect from neutral paths
    if (NEUTRAL_PATHS.some((p) => pathname.startsWith(p))) return;

    // Don't redirect if already on the correct role prefix
    const correctPrefix = ROLE_PREFIXES[role];
    if (correctPrefix && pathname.startsWith(correctPrefix)) {
      hasRedirected.current = false;
      return;
    }

    // Redirect once to the correct dashboard
    if (!hasRedirected.current) {
      hasRedirected.current = true;
      const target = ROLE_DASHBOARDS[role] ?? '/admin/overview';
      router.replace(target);
    }
  }, [role, isSignedIn, isLoading, pathname, router]);

  // Reset redirect flag when role changes (e.g., org switch)
  useEffect(() => {
    hasRedirected.current = false;
  }, [role]);
}
