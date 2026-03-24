import { describe, expect, it, vi } from 'vitest';
import {
  getActiveOrganizationMembership,
  requireActiveOrganizationMembership,
  resolveIdentityClerkOrgId,
} from '../../convex/authHelpers';

function createQueryResult(value: unknown) {
  return {
    first: vi.fn(async () => value),
    unique: vi.fn(async () => value),
    collect: vi.fn(async () => (Array.isArray(value) ? value : [])),
  };
}

function createAuthCtx(options?: {
  identity?: Record<string, unknown> | null;
  user?: Record<string, unknown> | null;
  organization?: Record<string, unknown> | null;
  membership?: Record<string, unknown> | null;
}) {
  const identity = options?.identity ?? null;
  const user = options?.user ?? null;
  const organization = options?.organization ?? null;
  const membership = options?.membership ?? null;
  const dbGet = vi.fn(async () => organization);

  const ctx = {
    auth: {
      getUserIdentity: vi.fn(async () => identity),
    },
    db: {
      query: vi.fn((table: string) => ({
        withIndex: vi.fn(() => {
          if (table === 'users') return createQueryResult(user);
          if (table === 'organizations') return createQueryResult(organization);
          if (table === 'memberships') return createQueryResult(membership);
          if (table === 'orgSettings') return createQueryResult(null);
          return createQueryResult(null);
        }),
      })),
      get: dbGet,
    },
  };

  return { ctx, dbGet };
}

describe('resolveIdentityClerkOrgId', () => {
  it('uses org_id when Clerk provides it directly', () => {
    expect(resolveIdentityClerkOrgId({ org_id: 'org_direct' })).toBe('org_direct');
  });

  it('falls back to the compact organization payload when present', () => {
    expect(resolveIdentityClerkOrgId({ o: { id: 'org_compact' } })).toBe('org_compact');
  });

  it('returns null when the Clerk session has no active org', () => {
    expect(resolveIdentityClerkOrgId({})).toBeNull();
  });
});

describe('active organization membership helpers', () => {
  it('returns null instead of using stored activeOrganizationId when Clerk has no active org', async () => {
    const { ctx, dbGet } = createAuthCtx({
      identity: { subject: 'user_1' },
      user: {
        _id: 'user_doc_1',
        authUserId: 'user_1',
        activeOrganizationId: 'org_stored',
      },
    });

    await expect(getActiveOrganizationMembership(ctx as never)).resolves.toBeNull();
    expect(dbGet).not.toHaveBeenCalled();
  });

  it('throws no active organization instead of falling back to stored activeOrganizationId', async () => {
    const { ctx, dbGet } = createAuthCtx({
      identity: { subject: 'user_1' },
      user: {
        _id: 'user_doc_1',
        authUserId: 'user_1',
        activeOrganizationId: 'org_stored',
      },
    });

    await expect(requireActiveOrganizationMembership(ctx as never)).rejects.toThrow(
      'No active organization selected',
    );
    expect(dbGet).not.toHaveBeenCalled();
  });

  it('still resolves membership when Clerk provides an active org id', async () => {
    const { ctx } = createAuthCtx({
      identity: { subject: 'user_1', org_id: 'org_clerk' },
      user: {
        _id: 'user_doc_1',
        authUserId: 'user_1',
        activeOrganizationId: 'org_stored',
      },
      organization: {
        _id: 'org_doc_1',
        clerkOrgId: 'org_clerk',
      },
      membership: {
        _id: 'membership_1',
        role: 'owner_admin',
        status: 'active',
      },
    });

    await expect(getActiveOrganizationMembership(ctx as never)).resolves.toMatchObject({
      organizationId: 'org_doc_1',
      membership: {
        _id: 'membership_1',
      },
    });
  });
});
