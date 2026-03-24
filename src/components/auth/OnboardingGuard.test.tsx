/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { OnboardingGuard } from './OnboardingGuard';

const navigationMock = vi.hoisted(() => ({
  replace: vi.fn(),
}));

const clerkMock = vi.hoisted(() => ({
  orgId: null as string | null,
  user: null as {
    organizationMemberships?: Array<{ organization: { id: string }; role: string }>;
  } | null,
  organization: null as { id: string } | null,
  membership: null as { role: string } | null,
  isLoaded: true,
}));

const convexMock = vi.hoisted(() => ({
  isAuthenticated: false,
  isLoading: false,
  activeOrg: null as unknown,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: navigationMock.replace,
  }),
}));

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    orgId: clerkMock.orgId,
  }),
  useUser: () => ({
    user: clerkMock.user,
  }),
  useOrganization: () => clerkMock,
}));

vi.mock('convex/react', () => ({
  useConvexAuth: () => ({
    isAuthenticated: convexMock.isAuthenticated,
    isLoading: convexMock.isLoading,
  }),
  useQuery: () => convexMock.activeOrg,
}));

describe('OnboardingGuard', () => {
  beforeEach(() => {
    cleanup();
    navigationMock.replace.mockReset();
    clerkMock.orgId = null;
    clerkMock.user = null;
    clerkMock.organization = null;
    clerkMock.membership = null;
    clerkMock.isLoaded = true;
    convexMock.isAuthenticated = false;
    convexMock.isLoading = false;
    convexMock.activeOrg = null;
  });

  afterEach(() => {
    cleanup();
  });

  it('redirects a single-org admin away from onboarding even without an active org id', async () => {
    clerkMock.user = {
      organizationMemberships: [
        {
          organization: { id: 'org_1' },
          role: 'admin',
        },
      ],
    };

    render(
      <OnboardingGuard>
        <div>Onboarding content</div>
      </OnboardingGuard>,
    );

    await waitFor(() => {
      expect(navigationMock.replace).toHaveBeenCalledWith('/admin/overview');
    });
  });
});
