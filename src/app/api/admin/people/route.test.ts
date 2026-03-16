import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { AdminPeopleError, createProvisionedPerson } from '@/lib/server/adminPeople';
import { POST } from './route';

vi.mock('@/lib/server/adminPeople', async () => {
  const actual = await vi.importActual<typeof import('@/lib/server/adminPeople')>('@/lib/server/adminPeople');
  return {
    ...actual,
    createProvisionedPerson: vi.fn(),
  };
});

const mockedCreateProvisionedPerson = vi.mocked(createProvisionedPerson);

describe('POST /api/admin/people', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a person and normalizes missing role to employee', async () => {
    mockedCreateProvisionedPerson.mockResolvedValueOnce({
      user: { _id: 'user_1' },
      membership: { _id: 'membership_1' },
    } as never);

    const request = new NextRequest('http://localhost/api/admin/people', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Ada Nwobi',
        email: 'ada@company.com',
        phone: '+2348012345678',
        password: 'password123',
        siteId: 'site_1',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mockedCreateProvisionedPerson).toHaveBeenCalledWith({
      name: 'Ada Nwobi',
      email: 'ada@company.com',
      phone: '+2348012345678',
      password: 'password123',
      role: 'employee',
      siteId: 'site_1',
      teamId: undefined,
    });
  });

  it('returns service errors with their original status', async () => {
    mockedCreateProvisionedPerson.mockRejectedValueOnce(
      new AdminPeopleError(403, 'Only the organization owner can manage people.'),
    );

    const request = new NextRequest('http://localhost/api/admin/people', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: 'Only the organization owner can manage people.',
    });
  });
});
