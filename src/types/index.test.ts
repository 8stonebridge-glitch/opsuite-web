import { describe, expect, it } from 'vitest';
import { clerkRoleToAppRole } from './index';

describe('clerkRoleToAppRole', () => {
  it('maps admin to admin', () => {
    expect(clerkRoleToAppRole('org:admin')).toBe('admin');
  });

  it('maps bare admin to admin', () => {
    expect(clerkRoleToAppRole('admin')).toBe('admin');
  });

  it('maps owner_admin to admin', () => {
    expect(clerkRoleToAppRole('org:owner_admin')).toBe('admin');
  });

  it('maps bare owner_admin to admin', () => {
    expect(clerkRoleToAppRole('owner_admin')).toBe('admin');
  });

  it('maps subadmin to subadmin', () => {
    expect(clerkRoleToAppRole('org:subadmin')).toBe('subadmin');
  });

  it('maps bare subadmin to subadmin', () => {
    expect(clerkRoleToAppRole('subadmin')).toBe('subadmin');
  });

  it('maps employee to employee', () => {
    expect(clerkRoleToAppRole('org:employee')).toBe('employee');
  });

  it('maps bare employee to employee', () => {
    expect(clerkRoleToAppRole('employee')).toBe('employee');
  });

  it('returns null for unknown roles', () => {
    expect(clerkRoleToAppRole('org:custom_role')).toBeNull();
  });
});
