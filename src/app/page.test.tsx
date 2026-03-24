/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HomePage from './page';

const authMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() => vi.fn((destination: string) => {
  throw new Error(`NEXT_REDIRECT:${destination}`);
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: authMock,
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

describe('HomePage', () => {
  beforeEach(() => {
    authMock.mockReset();
    redirectMock.mockClear();
  });

  it('redirects users with a recognized role to their dashboard', async () => {
    authMock.mockResolvedValueOnce({
      userId: 'user_1',
      orgId: 'org_1',
      orgRole: 'org:admin',
    });

    await expect(HomePage()).rejects.toThrow('NEXT_REDIRECT:/admin/overview');
    expect(redirectMock).toHaveBeenCalledWith('/admin/overview');
  });

  it('renders a recovery state for signed-in users with unresolved org role', async () => {
    authMock.mockResolvedValueOnce({
      userId: 'user_1',
      orgId: 'org_1',
      orgRole: null,
      sessionClaims: { org_id: 'org_1' },
    });

    const ui = await HomePage();
    render(ui);

    expect(screen.getByText('Finishing workspace access')).toBeDefined();
    expect(screen.getByText(/still resolving your organization role/i)).toBeDefined();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
