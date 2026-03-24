import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: authMock,
}));

describe('GET /api/auth/callback', () => {
  beforeEach(() => {
    authMock.mockReset();
  });

  it('redirects unauthenticated users to sign-in', async () => {
    authMock.mockResolvedValueOnce({ userId: null, orgId: null, orgRole: null });

    const response = await GET(new Request('http://localhost/api/auth/callback'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/sign-in');
  });

  it('routes owner_admin users to the admin dashboard', async () => {
    authMock.mockResolvedValueOnce({ userId: 'user_1', orgId: 'org_1', orgRole: 'org:owner_admin' });

    const response = await GET(new Request('http://localhost/api/auth/callback'));

    expect(response.headers.get('location')).toBe('http://localhost/admin/overview');
  });

  it('routes subadmin users to the subadmin dashboard', async () => {
    authMock.mockResolvedValueOnce({ userId: 'user_1', orgId: 'org_1', orgRole: 'org:subadmin' });

    const response = await GET(new Request('http://localhost/api/auth/callback'));

    expect(response.headers.get('location')).toBe('http://localhost/subadmin/overview');
  });

  it('routes employee users to the employee dashboard', async () => {
    authMock.mockResolvedValueOnce({ userId: 'user_1', orgId: 'org_1', orgRole: 'org:employee' });

    const response = await GET(new Request('http://localhost/api/auth/callback'));

    expect(response.headers.get('location')).toBe('http://localhost/employee/my-day');
  });

  it('routes unknown roles to onboarding', async () => {
    authMock.mockResolvedValueOnce({ userId: 'user_1', orgId: 'org_1', orgRole: 'org:custom_role' });

    const response = await GET(new Request('http://localhost/api/auth/callback'));

    expect(response.headers.get('location')).toBe('http://localhost/onboarding');
  });

  it('routes signed-in users without an org to onboarding', async () => {
    authMock.mockResolvedValueOnce({ userId: 'user_1', orgId: null, orgRole: null });

    const response = await GET(new Request('http://localhost/api/auth/callback'));

    expect(response.headers.get('location')).toBe('http://localhost/onboarding');
  });
});
