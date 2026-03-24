/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import OnboardingLayout from './layout';
import { AppProvider, useApp } from '@/store/AppContext';

const navigationMock = vi.hoisted(() => ({
  pathname: '/onboarding',
  replace: vi.fn(),
}));

const clerkMock = vi.hoisted(() => ({
  organization: null as { id: string } | null,
  membership: null as { role: string } | null,
  isLoaded: true,
}));

const convexMock = vi.hoisted(() => ({
  isAuthenticated: true,
  isLoading: false,
  activeOrg: null as unknown,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navigationMock.pathname,
  useRouter: () => ({
    replace: navigationMock.replace,
  }),
}));

vi.mock('@/components/auth/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@clerk/nextjs', () => ({
  useOrganization: () => clerkMock,
}));

vi.mock('convex/react', () => ({
  useConvexAuth: () => ({
    isAuthenticated: convexMock.isAuthenticated,
    isLoading: convexMock.isLoading,
  }),
  useQuery: () => convexMock.activeOrg,
}));

function StateProbe() {
  const { state } = useApp();

  return (
    <div>
      <div data-testid="org-name">{state.onboarding.orgName}</div>
      <div data-testid="admin-name">{state.onboarding.adminName}</div>
      <div data-testid="industry-id">{state.onboarding.industry?.id ?? ''}</div>
      <div data-testid="sites-count">{state.onboarding.sites.length}</div>
    </div>
  );
}

describe('OnboardingLayout draft hydration', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    navigationMock.pathname = '/onboarding';
    navigationMock.replace.mockReset();
    clerkMock.organization = null;
    clerkMock.membership = null;
    clerkMock.isLoaded = true;
    convexMock.isAuthenticated = true;
    convexMock.isLoading = false;
    convexMock.activeOrg = null;
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('hydrates saved onboarding data including sites before resuming the flow', async () => {
    localStorage.setItem('opsuite_onboarding', JSON.stringify({
      orgName: 'Skyhomes Properties',
      industry: {
        id: 'real_estate',
        name: 'Real Estate',
        sitesLabel: 'Sites',
        color: '#059669',
      },
      adminName: 'Sunday Agwaze',
      sites: [
        { id: 'site-1', name: 'Main Office' },
        { id: 'site-2', name: 'Annex' },
      ],
    }));

    render(
      <AppProvider>
        <OnboardingLayout>
          <StateProbe />
        </OnboardingLayout>
      </AppProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('org-name').textContent).toBe('Skyhomes Properties');
      expect(screen.getByTestId('admin-name').textContent).toBe('Sunday Agwaze');
      expect(screen.getByTestId('industry-id').textContent).toBe('real_estate');
      expect(screen.getByTestId('sites-count').textContent).toBe('2');
    });

    expect(navigationMock.replace).toHaveBeenCalledWith('/onboarding/add-sites');

    const storedDraft = JSON.parse(localStorage.getItem('opsuite_onboarding') ?? '{}');
    expect(storedDraft.sites).toHaveLength(2);
  });

  it('shows a loading shell instead of a blank page while onboarding auth state resolves', () => {
    clerkMock.isLoaded = false;
    convexMock.isAuthenticated = false;
    convexMock.isLoading = true;
    convexMock.activeOrg = undefined;

    render(
      <AppProvider>
        <OnboardingLayout>
          <StateProbe />
        </OnboardingLayout>
      </AppProvider>,
    );

    expect(screen.getByText('Loading your onboarding')).toBeDefined();
    expect(screen.getByText("We're checking your organization details.")).toBeDefined();
  });
});
