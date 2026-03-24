import { describe, expect, it } from 'vitest';
import { clerkRoleToAppRole } from './index';

describe('clerkRoleToAppRole', () => {
  it('maps owner_admin to admin', () => {
    expect(clerkRoleToAppRole('org:owner_admin')).toBe('admin');
  });

  it('maps subadmin to subadmin', () => {
    expect(clerkRoleToAppRole('org:subadmin')).toBe('subadmin');
  });

  it('maps employee to employee', () => {
    expect(clerkRoleToAppRole('org:employee')).toBe('employee');
  });

  it('returns null for unknown roles', () => {
    expect(clerkRoleToAppRole('org:custom_role')).toBeNull();
  });
});
