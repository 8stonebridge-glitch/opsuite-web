import { describe, expect, it } from 'vitest';
import { resolveClientClerkOrgId, resolveClientClerkOrgRole } from './clerkClientOrg';

describe('resolveClientClerkOrgId', () => {
  it('prefers the active org id when Clerk provides it', () => {
    expect(resolveClientClerkOrgId({
      activeOrgId: 'org_active',
      organizationMemberships: [{ organization: { id: 'org_only' }, role: 'admin' }],
    })).toBe('org_active');
  });

  it('falls back to the only membership org id when no active org is set', () => {
    expect(resolveClientClerkOrgId({
      activeOrgId: null,
      organizationMemberships: [{ organization: { id: 'org_only' }, role: 'admin' }],
    })).toBe('org_only');
  });

  it('returns null when multiple memberships exist and no active org is set', () => {
    expect(resolveClientClerkOrgId({
      activeOrgId: null,
      organizationMemberships: [
        { organization: { id: 'org_a' }, role: 'admin' },
        { organization: { id: 'org_b' }, role: 'admin' },
      ],
    })).toBeNull();
  });
});

describe('resolveClientClerkOrgRole', () => {
  it('prefers the direct membership role when Clerk provides it', () => {
    expect(resolveClientClerkOrgRole({
      activeOrgId: 'org_active',
      membershipRole: 'org:admin',
      organizationMemberships: [{ organization: { id: 'org_active' }, role: 'admin' }],
    })).toBe('org:admin');
  });

  it('falls back to the matching active-org membership role', () => {
    expect(resolveClientClerkOrgRole({
      activeOrgId: 'org_b',
      membershipRole: null,
      organizationMemberships: [
        { organization: { id: 'org_a' }, role: 'employee' },
        { organization: { id: 'org_b' }, role: 'admin' },
      ],
    })).toBe('admin');
  });

  it('falls back to the only membership role when no active org is set', () => {
    expect(resolveClientClerkOrgRole({
      activeOrgId: null,
      membershipRole: null,
      organizationMemberships: [{ organization: { id: 'org_only' }, role: 'admin' }],
    })).toBe('admin');
  });

  it('returns null when multiple memberships exist and no active org is set', () => {
    expect(resolveClientClerkOrgRole({
      activeOrgId: null,
      membershipRole: null,
      organizationMemberships: [
        { organization: { id: 'org_a' }, role: 'employee' },
        { organization: { id: 'org_b' }, role: 'admin' },
      ],
    })).toBeNull();
  });
});
