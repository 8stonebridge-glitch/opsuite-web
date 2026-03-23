'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/store/AppContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { OnboardingGuard } from '@/components/auth/OnboardingGuard';
import type { Role } from '@/types';

const STORAGE_KEY = 'opsuite_onboarding';

// ── Role-aware onboarding paths ────────────────────────────────────

const STEP_ROUTES_BY_ROLE: Record<Role, readonly string[]> = {
  admin: [
    '/onboarding/org-name',
    '/onboarding/industry',
    '/onboarding/admin-name',
    '/onboarding/add-sites',
  ],
  subadmin: [
    '/onboarding/admin-name',
    '/onboarding/industry',
  ],
  employee: [
    '/onboarding/admin-name',
  ],
} as const;

/** Determine the furthest completed step based on onboarding state and role */
function getResumeStep(
  onboarding: { orgName: string; industry: unknown; adminName: string },
  role: Role,
): number {
  const routes = STEP_ROUTES_BY_ROLE[role];

  if (role === 'admin') {
    if (!onboarding.orgName) return 0;
    if (!onboarding.industry) return 1;
    if (!onboarding.adminName) return 2;
    return 3;
  }

  if (role === 'subadmin') {
    if (!onboarding.adminName) return 0;
    // industry is optional/view-only for subadmins, skip if already past
    return 1;
  }

  // employee — single step
  if (!onboarding.adminName) return 0;
  return Math.min(0, routes.length - 1);
}

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const { state, dispatch } = useApp();
  const pathname = usePathname();
  const router = useRouter();

  const role = state.role;
  const stepRoutes = STEP_ROUTES_BY_ROLE[role];

  // Hydrate onboarding state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const data = JSON.parse(saved);
      if (data.orgName && !state.onboarding.orgName) {
        dispatch({ type: 'SET_ORG_NAME', name: data.orgName });
      }
      if (data.industry && !state.onboarding.industry) {
        dispatch({ type: 'SET_INDUSTRY', industry: data.industry });
      }
      if (data.adminName && !state.onboarding.adminName) {
        dispatch({ type: 'SET_ADMIN_NAME', name: data.adminName });
      }
    } catch { /* ignore corrupt localStorage */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist onboarding state to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        orgName: state.onboarding.orgName,
        industry: state.onboarding.industry,
        adminName: state.onboarding.adminName,
      }));
    } catch { /* quota exceeded or private mode */ }
  }, [state.onboarding.orgName, state.onboarding.industry, state.onboarding.adminName]);

  // Redirect to the furthest incomplete step if user lands on /onboarding
  useEffect(() => {
    if (pathname === '/onboarding') {
      const step = getResumeStep(state.onboarding, role);
      const target = stepRoutes[step] ?? stepRoutes[0] ?? '/onboarding/org-name';
      router.replace(target);
    }
  }, [pathname, state.onboarding, role, stepRoutes, router]);

  // Clear localStorage when onboarding completes
  useEffect(() => {
    if (state.onboardingComplete) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [state.onboardingComplete]);

  return (
    <ProtectedRoute>
      <OnboardingGuard>
        <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
          {children}
        </div>
      </OnboardingGuard>
    </ProtectedRoute>
  );
}

