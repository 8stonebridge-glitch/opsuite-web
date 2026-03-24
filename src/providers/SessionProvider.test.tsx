/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { SessionProvider, useSession } from './SessionProvider';

const clerkMock = vi.hoisted(() => ({
  orgId: null as string | null,
  isLoaded: true,
  isSignedIn: false,
  user: null as {
    id: string;
    imageUrl?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    emailAddresses: Array<{ emailAddress: string }>;
    organizationMemberships?: Array<{ organization: { id: string }; role?: string | null }>;
  } | null,
  organizationLoaded: true,
  membership: null as { role?: string | null } | null,
}));

vi.mock('@/store/AppContext', () => ({
  useApp: () => {
    throw new Error('SessionProvider should not read AppContext for role resolution');
  },
}));

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    orgId: clerkMock.orgId,
  }),
  useUser: () => ({
    isLoaded: clerkMock.isLoaded,
    isSignedIn: clerkMock.isSignedIn,
    user: clerkMock.user,
  }),
  useOrganization: () => ({
    membership: clerkMock.membership,
    isLoaded: clerkMock.organizationLoaded,
  }),
}));

function Probe() {
  const session = useSession();
  return (
    <div>
      <span data-testid="role">{session.role ?? 'none'}</span>
      <span data-testid="loading">{session.isLoading ? 'loading' : 'ready'}</span>
      <span data-testid="signed-in">{session.isSignedIn ? 'yes' : 'no'}</span>
    </div>
  );
}

describe('SessionProvider', () => {
  beforeEach(() => {
    cleanup();
    clerkMock.orgId = null;
    clerkMock.isLoaded = true;
    clerkMock.isSignedIn = false;
    clerkMock.user = null;
    clerkMock.organizationLoaded = true;
    clerkMock.membership = null;
  });

  afterEach(() => {
    cleanup();
  });

  it('resolves role from a single Clerk membership when no active org id is set', () => {
    clerkMock.isSignedIn = true;
    clerkMock.user = {
      id: 'user_1',
      firstName: 'Ada',
      lastName: 'Admin',
      imageUrl: null,
      emailAddresses: [{ emailAddress: 'ada@example.com' }],
      organizationMemberships: [
        {
          organization: { id: 'org_1' },
          role: 'org:admin',
        },
      ],
    };

    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );

    expect(screen.getByTestId('role').textContent).toBe('admin');
    expect(screen.getByTestId('loading').textContent).toBe('ready');
    expect(screen.getByTestId('signed-in').textContent).toBe('yes');
  });

  it('keeps role null when Clerk has no resolved membership role', () => {
    clerkMock.isSignedIn = true;
    clerkMock.user = {
      id: 'user_2',
      firstName: 'Eve',
      lastName: 'Employee',
      imageUrl: null,
      emailAddresses: [{ emailAddress: 'eve@example.com' }],
      organizationMemberships: [],
    };

    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );

    expect(screen.getByTestId('role').textContent).toBe('none');
    expect(screen.getByTestId('loading').textContent).toBe('ready');
    expect(screen.getByTestId('signed-in').textContent).toBe('yes');
  });
});
