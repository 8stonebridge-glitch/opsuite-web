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

  it('redirects signed-in users to the root role router', async () => {
    authMock.mockResolvedValueOnce({ userId: 'user_1', orgId: 'org_1', orgRole: 'org:owner_admin' });

    const response = await GET(new Request('http://localhost/api/auth/callback'));

    expect(response.headers.get('location')).toBe('http://localhost/');
  });

  it('redirects signed-in users without an org to the root role router', async () => {
    authMock.mockResolvedValueOnce({ userId: 'user_1', orgId: null, orgRole: null });

    const response = await GET(new Request('http://localhost/api/auth/callback'));

    expect(response.headers.get('location')).toBe('http://localhost/');
  });

  it('falls back to root if Clerk auth throws during the callback handoff', async () => {
    authMock.mockRejectedValueOnce(new Error('auth context missing'));

    const response = await GET(new Request('http://localhost/api/auth/callback'));

    expect(response.headers.get('location')).toBe('http://localhost/');
  });
});
