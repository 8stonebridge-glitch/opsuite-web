/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { useRoleRouter } from './useRoleRouter';

const sessionMock = vi.hoisted(() => ({
  role: null as 'admin' | 'subadmin' | 'employee' | null,
  isSignedIn: false,
  isLoading: false,
}));

const navigationMock = vi.hoisted(() => ({
  pathname: '/',
  replace: vi.fn(),
}));

vi.mock('@/providers/SessionProvider', () => ({
  useSession: () => sessionMock,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: navigationMock.replace }),
  usePathname: () => navigationMock.pathname,
}));

function Probe() {
  useRoleRouter();
  return null;
}

describe('useRoleRouter', () => {
  beforeEach(() => {
    cleanup();
    sessionMock.role = null;
    sessionMock.isSignedIn = false;
    sessionMock.isLoading = false;
    navigationMock.pathname = '/';
    navigationMock.replace.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('routes admins from the root path to the admin overview', async () => {
    sessionMock.role = 'admin';
    sessionMock.isSignedIn = true;

    render(<Probe />);

    await waitFor(() => {
      expect(navigationMock.replace).toHaveBeenCalledWith('/admin/overview');
    });
  });

  it('does not redirect when the user is already on the correct admin route', async () => {
    sessionMock.role = 'admin';
    sessionMock.isSignedIn = true;
    navigationMock.pathname = '/admin/overview';

    render(<Probe />);

    await waitFor(() => {
      expect(navigationMock.replace).not.toHaveBeenCalled();
    });
  });

  it('ignores onboarding routes', async () => {
    sessionMock.role = 'admin';
    sessionMock.isSignedIn = true;
    navigationMock.pathname = '/onboarding/org-name';

    render(<Probe />);

    await waitFor(() => {
      expect(navigationMock.replace).not.toHaveBeenCalled();
    });
  });
});
