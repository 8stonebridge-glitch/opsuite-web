/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ProtectedRoute } from './ProtectedRoute';

const sessionMock = vi.hoisted(() => ({
  isLoading: false,
  isSignedIn: true,
}));
const navigationMock = vi.hoisted(() => ({
  replace: vi.fn(),
  pathname: '/onboarding/add-sites',
  searchParams: new URLSearchParams(),
}));

vi.mock('@/providers/SessionProvider', () => ({
  useSession: () => sessionMock,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: navigationMock.replace }),
  usePathname: () => navigationMock.pathname,
  useSearchParams: () => navigationMock.searchParams,
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    cleanup();
    sessionMock.isLoading = false;
    sessionMock.isSignedIn = true;
    navigationMock.replace.mockReset();
    navigationMock.pathname = '/onboarding/add-sites';
    navigationMock.searchParams = new URLSearchParams();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows a loading shell while auth is still resolving', () => {
    sessionMock.isLoading = true;
    sessionMock.isSignedIn = false;

    render(
      <ProtectedRoute>
        <div>Secret content</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText('Loading your workspace')).toBeDefined();
    expect(screen.queryByText('Secret content')).toBeNull();
  });

  it('renders children once the user is signed in', () => {
    render(
      <ProtectedRoute>
        <div>Secret content</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText('Secret content')).toBeDefined();
  });

  it('redirects to sign-in for a resolved signed-out state', () => {
    sessionMock.isLoading = false;
    sessionMock.isSignedIn = false;

    render(
      <ProtectedRoute>
        <div>Secret content</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText('Redirecting to sign in')).toBeDefined();
    expect(screen.getByText('This page requires an active session.')).toBeDefined();
    expect(navigationMock.replace).toHaveBeenCalledWith('/sign-in?returnTo=%2Fonboarding%2Fadd-sites');
  });

  it('preserves the current query string when redirecting to sign-in', () => {
    sessionMock.isLoading = false;
    sessionMock.isSignedIn = false;
    navigationMock.searchParams = new URLSearchParams('invite=abc');

    render(
      <ProtectedRoute>
        <div>Secret content</div>
      </ProtectedRoute>,
    );

    expect(navigationMock.replace).toHaveBeenCalledWith('/sign-in?returnTo=%2Fonboarding%2Fadd-sites%3Finvite%3Dabc');
  });
});
