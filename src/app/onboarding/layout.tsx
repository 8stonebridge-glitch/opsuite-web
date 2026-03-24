'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/store/AppContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { OnboardingGuard } from '@/components/auth/OnboardingGuard';
import type { Industry, Role, Site } from '@/types';

const STORAGE_KEY = 'opsuite_onboarding';

interface StoredOnboardingDraft {
  orgName?: unknown;
  industry?: unknown;
  adminName?: unknown;
  sites?: unknown;
}

function isStoredIndustry(value: unknown): value is Industry {
  return !!value &&
    typeof value === 'object' &&
    typeof (value as { id?: unknown }).id === 'string' &&
    typeof (value as { name?: unknown }).name === 'string' &&
    typeof (value as { sitesLabel?: unknown }).sitesLabel === 'string' &&
    typeof (value as { color?: unknown }).color === 'string';
}

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
  const [hasHydratedDraft, setHasHydratedDraft] = useState(false);

  const role = state.role;
  const stepRoutes = STEP_ROUTES_BY_ROLE[role];

  // Hydrate onboarding state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const data = JSON.parse(saved) as StoredOnboardingDraft;
      if (typeof data.orgName === 'string' && data.orgName && !state.onboarding.orgName) {
        dispatch({ type: 'SET_ORG_NAME', name: data.orgName });
      }
      if (isStoredIndustry(data.industry) && !state.onboarding.industry) {
        dispatch({ type: 'SET_INDUSTRY', industry: data.industry });
      }
      if (typeof data.adminName === 'string' && data.adminName && !state.onboarding.adminName) {
        dispatch({ type: 'SET_ADMIN_NAME', name: data.adminName });
      }
      if (Array.isArray(data.sites) && state.onboarding.sites.length === 0) {
        const sites = data.sites.flatMap((site): Site[] => {
          if (
            site &&
            typeof site === 'object' &&
            typeof (site as { id?: unknown }).id === 'string' &&
            typeof (site as { name?: unknown }).name === 'string'
          ) {
            return [{
              id: (site as { id: string }).id,
              name: (site as { name: string }).name,
            }];
          }
          return [];
        });
        if (sites.length > 0) {
          dispatch({ type: 'SET_ONBOARDING_SITES', sites });
        }
      }
    } catch { /* ignore corrupt localStorage */ }
    finally {
      setHasHydratedDraft(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist onboarding state to localStorage on every change
  useEffect(() => {
    if (!hasHydratedDraft) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        orgName: state.onboarding.orgName,
        industry: state.onboarding.industry,
        adminName: state.onboarding.adminName,
        sites: state.onboarding.sites,
      }));
    } catch { /* quota exceeded or private mode */ }
  }, [hasHydratedDraft, state.onboarding.orgName, state.onboarding.industry, state.onboarding.adminName, state.onboarding.sites]);

  // Redirect to the furthest incomplete step if user lands on /onboarding
  useEffect(() => {
    if (!hasHydratedDraft) return;
    if (pathname === '/onboarding') {
      const step = getResumeStep(state.onboarding, role);
      const target = stepRoutes[step] ?? stepRoutes[0] ?? '/onboarding/org-name';
      router.replace(target);
    }
  }, [hasHydratedDraft, pathname, state.onboarding, role, stepRoutes, router]);

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
