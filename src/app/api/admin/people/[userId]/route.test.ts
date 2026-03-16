import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  AdminPeopleError,
  deleteProvisionedPerson,
  updateProvisionedPerson,
} from '@/lib/server/adminPeople';
import { DELETE, PATCH } from './route';

vi.mock('@/lib/server/adminPeople', async () => {
  const actual = await vi.importActual<typeof import('@/lib/server/adminPeople')>('@/lib/server/adminPeople');
  return {
    ...actual,
    updateProvisionedPerson: vi.fn(),
    deleteProvisionedPerson: vi.fn(),
  };
});

const mockedUpdateProvisionedPerson = vi.mocked(updateProvisionedPerson);
const mockedDeleteProvisionedPerson = vi.mocked(deleteProvisionedPerson);

describe('/api/admin/people/[userId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('patches a person with the submitted payload', async () => {
    mockedUpdateProvisionedPerson.mockResolvedValueOnce({
      userId: 'user_1',
      authUserId: 'clerk_user_1',
      email: 'ada@company.com',
      phone: '+2348012345678',
    });

    const request = new NextRequest('http://localhost/api/admin/people/user_1', {
      method: 'PATCH',
      body: JSON.stringify({
        name: 'Ada Nwobi',
        email: 'ada@company.com',
        phone: '+2348012345678',
        siteId: 'site_1',
        teamId: 'team_1',
      }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ userId: 'user_1' }),
    });

    expect(response.status).toBe(200);
    expect(mockedUpdateProvisionedPerson).toHaveBeenCalledWith('user_1', {
      name: 'Ada Nwobi',
      email: 'ada@company.com',
      phone: '+2348012345678',
      password: undefined,
      siteId: 'site_1',
      teamId: 'team_1',
    });
  });

  it('returns structured admin errors from patch requests', async () => {
    mockedUpdateProvisionedPerson.mockRejectedValueOnce(
      new AdminPeopleError(404, 'We could not find that person in the active organization.'),
    );

    const request = new NextRequest('http://localhost/api/admin/people/user_1', {
      method: 'PATCH',
      body: JSON.stringify({}),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ userId: 'user_1' }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: 'We could not find that person in the active organization.',
    });
  });

  it('deletes a person through the provisioned delete service', async () => {
    mockedDeleteProvisionedPerson.mockResolvedValueOnce({ removed: true });

    const request = new NextRequest('http://localhost/api/admin/people/user_1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ userId: 'user_1' }),
    });

    expect(response.status).toBe(200);
    expect(mockedDeleteProvisionedPerson).toHaveBeenCalledWith('user_1');
    await expect(response.json()).resolves.toEqual({ removed: true });
  });
});
