import { describe, expect, it } from 'vitest';
import { resolveClerkAppRole, resolveClerkOrgId, resolveClerkOrgRole, resolveServerAccess } from './clerkAuth';

describe('resolveClerkOrgId', () => {
  it('uses orgId when Clerk provides it directly', () => {
    expect(resolveClerkOrgId({ orgId: 'org_direct', sessionClaims: { org_id: 'org_claim' } })).toBe('org_direct');
  });

  it('falls back to sessionClaims.org_id when orgId is missing', () => {
    expect(resolveClerkOrgId({ orgId: null, sessionClaims: { org_id: 'org_claim' } })).toBe('org_claim');
  });

  it('falls back to the compact sessionClaims.o.id when orgId is missing', () => {
    expect(resolveClerkOrgId({ orgId: null, sessionClaims: { o: { id: 'org_compact' } } })).toBe('org_compact');
  });

  it('returns null when no org id exists', () => {
    expect(resolveClerkOrgId({ orgId: null, sessionClaims: null })).toBeNull();
  });
});

describe('resolveClerkOrgRole', () => {
  it('uses orgRole when Clerk provides it directly', () => {
    expect(resolveClerkOrgRole({ orgRole: 'org:admin', sessionClaims: { org_role: 'admin' } })).toBe('org:admin');
  });

  it('falls back to sessionClaims.org_role when orgRole is missing', () => {
    expect(resolveClerkOrgRole({ orgRole: null, sessionClaims: { org_role: 'admin' } })).toBe('admin');
  });

  it('falls back to the compact sessionClaims.o.rol when orgRole is missing', () => {
    expect(resolveClerkOrgRole({ orgRole: null, sessionClaims: { o: { rol: 'admin' } } })).toBe('admin');
  });

  it('returns null when no org role exists', () => {
    expect(resolveClerkOrgRole({ orgRole: null, sessionClaims: null })).toBeNull();
  });
});

describe('resolveClerkAppRole', () => {
  it('maps recognized Clerk roles to app roles', () => {
    expect(resolveClerkAppRole({ orgRole: 'org:owner_admin' })).toBe('admin');
    expect(resolveClerkAppRole({ orgRole: 'org:subadmin' })).toBe('subadmin');
    expect(resolveClerkAppRole({ orgRole: 'org:employee' })).toBe('employee');
  });

  it('returns null for unsupported roles', () => {
    expect(resolveClerkAppRole({ orgRole: 'org:viewer' })).toBeNull();
  });
});

describe('resolveServerAccess', () => {
  it('routes signed-out users to sign-in', () => {
    expect(resolveServerAccess({ userId: null, orgId: null, orgRole: null })).toEqual({
      status: 'signed_out',
      destination: '/sign-in',
      orgId: null,
      orgRole: null,
      appRole: null,
    });
  });

  it('routes signed-in users without an org to onboarding', () => {
    expect(resolveServerAccess({ userId: 'user_1', orgId: null, orgRole: null })).toEqual({
      status: 'needs_onboarding',
      destination: '/onboarding',
      orgId: null,
      orgRole: null,
      appRole: null,
    });
  });

  it('routes recognized roles to their dashboard', () => {
    expect(resolveServerAccess({ userId: 'user_1', orgId: 'org_1', orgRole: 'org:subadmin' })).toEqual({
      status: 'dashboard',
      destination: '/subadmin/overview',
      orgId: 'org_1',
      orgRole: 'org:subadmin',
      appRole: 'subadmin',
    });
  });

  it('keeps signed-in users with an org but unresolved role in recovery state', () => {
    expect(resolveServerAccess({ userId: 'user_1', orgId: 'org_1', orgRole: null })).toEqual({
      status: 'unresolved_role',
      destination: null,
      orgId: 'org_1',
      orgRole: null,
      appRole: null,
    });
  });
});
