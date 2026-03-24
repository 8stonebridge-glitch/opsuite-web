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

vi.mock('@/providers/SessionProvider', () => ({
  useSession: () => sessionMock,
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    cleanup();
    sessionMock.isLoading = false;
    sessionMock.isSignedIn = true;
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

  it('renders nothing for a resolved signed-out state', () => {
    sessionMock.isLoading = false;
    sessionMock.isSignedIn = false;

    const { container } = render(
      <ProtectedRoute>
        <div>Secret content</div>
      </ProtectedRoute>,
    );

    expect(container.firstChild).toBeNull();
  });
});
