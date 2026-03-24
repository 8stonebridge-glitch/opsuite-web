/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrgSwitcher } from './OrgSwitcher';

const dispatchMock = vi.hoisted(() => vi.fn());
const replaceMock = vi.hoisted(() => vi.fn());
const setActiveMock = vi.hoisted(() => vi.fn());
const useQueryMock = vi.hoisted(() => vi.fn());
const organizationListMock = vi.hoisted(() => ({
  isLoaded: true,
}));

vi.mock('../../store/AppContext', () => ({
  useApp: () => ({
    dispatch: dispatchMock,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

vi.mock('convex/react', () => ({
  useQuery: useQueryMock,
}));

vi.mock('@clerk/nextjs', () => ({
  useOrganizationList: () => ({
    setActive: setActiveMock,
    isLoaded: organizationListMock.isLoaded,
  }),
}));

describe('OrgSwitcher', () => {
  beforeEach(() => {
    dispatchMock.mockReset();
    replaceMock.mockReset();
    setActiveMock.mockReset();
    organizationListMock.isLoaded = true;
  });

  it('shows a loading message while organizations are being fetched', () => {
    useQueryMock.mockReturnValueOnce(undefined);

    render(<OrgSwitcher />);

    expect(screen.getByText('Loading organizations...')).toBeDefined();
  });

  it('switches organizations by calling Clerk setActive', async () => {
    useQueryMock.mockReturnValueOnce([
      {
        organization: {
          _id: 'org_doc_1',
          name: 'Alpha Org',
          industryId: 'fm',
          clerkOrgId: 'clerk_org_1',
        },
        membership: { _id: 'membership_1' },
        isActive: true,
      },
      {
        organization: {
          _id: 'org_doc_2',
          name: 'Beta Org',
          industryId: 'security',
          clerkOrgId: 'clerk_org_2',
        },
        membership: { _id: 'membership_2' },
        isActive: false,
      },
    ]);
    setActiveMock.mockResolvedValueOnce(undefined);

    render(<OrgSwitcher />);

    fireEvent.click(screen.getByRole('button', { name: /beta org/i }));

    await waitFor(() => {
      expect(setActiveMock).toHaveBeenCalledWith({ organization: 'clerk_org_2' });
    });
    expect(dispatchMock).toHaveBeenCalledWith({ type: 'SWITCH_ORGANIZATION', workspaceId: 'org_doc_2' });
    expect(replaceMock).toHaveBeenCalledWith('/admin/overview');
  });

  it('disables switching for organizations that are not linked to Clerk', () => {
    useQueryMock.mockReturnValueOnce([
      {
        organization: {
          _id: 'org_doc_legacy',
          name: 'Legacy Org',
          industryId: 'fm',
          clerkOrgId: null,
        },
        membership: { _id: 'membership_legacy' },
        isActive: false,
      },
    ]);

    render(<OrgSwitcher />);

    const button = screen.getByRole('button', { name: /legacy org/i });
    expect(button.getAttribute('disabled')).not.toBeNull();
    expect(screen.getByText('Unavailable until linked to Clerk')).toBeDefined();
  });
});
