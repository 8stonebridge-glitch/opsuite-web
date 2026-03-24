import { clerkRoleToAppRole, type Role } from '@/types';

export interface ClerkAuthSnapshot {
  userId?: string | null;
  orgId?: string | null;
  orgRole?: string | null;
  sessionClaims?: Record<string, unknown> | null;
}

type SessionClaimsOrganization = {
  id?: unknown;
  rol?: unknown;
};

function getSessionClaimsOrganization(sessionClaims: Record<string, unknown> | null | undefined): SessionClaimsOrganization | null {
  const organization = sessionClaims?.o;
  if (organization && typeof organization === 'object') {
    return organization as SessionClaimsOrganization;
  }
  return null;
}

export function resolveClerkOrgId(authState: ClerkAuthSnapshot): string | null {
  if (typeof authState.orgId === 'string' && authState.orgId.length > 0) {
    return authState.orgId;
  }

  const claimedOrgId = authState.sessionClaims?.org_id;
  if (typeof claimedOrgId === 'string' && claimedOrgId.length > 0) {
    return claimedOrgId;
  }

  const compactOrgId = getSessionClaimsOrganization(authState.sessionClaims)?.id;
  return typeof compactOrgId === 'string' && compactOrgId.length > 0 ? compactOrgId : null;
}

export function resolveClerkOrgRole(authState: ClerkAuthSnapshot): string | null {
  if (typeof authState.orgRole === 'string' && authState.orgRole.length > 0) {
    return authState.orgRole;
  }

  const claimedOrgRole = authState.sessionClaims?.org_role;
  if (typeof claimedOrgRole === 'string' && claimedOrgRole.length > 0) {
    return claimedOrgRole;
  }

  const compactOrgRole = getSessionClaimsOrganization(authState.sessionClaims)?.rol;
  return typeof compactOrgRole === 'string' && compactOrgRole.length > 0 ? compactOrgRole : null;
}

export const APP_ROLE_DASHBOARDS: Record<Role, string> = {
  admin: '/admin/overview',
  subadmin: '/subadmin/overview',
  employee: '/employee/my-day',
};

export type ServerAccessResolution =
  | {
    status: 'signed_out';
    destination: '/sign-in';
    orgId: null;
    orgRole: null;
    appRole: null;
  }
  | {
    status: 'needs_onboarding';
    destination: '/onboarding';
    orgId: null;
    orgRole: string | null;
    appRole: null;
  }
  | {
    status: 'dashboard';
    destination: string;
    orgId: string;
    orgRole: string;
    appRole: Role;
  }
  | {
    status: 'unresolved_role';
    destination: null;
    orgId: string;
    orgRole: string | null;
    appRole: null;
  };

export function resolveClerkAppRole(authState: ClerkAuthSnapshot): Role | null {
  const orgRole = resolveClerkOrgRole(authState);
  return orgRole ? clerkRoleToAppRole(orgRole) : null;
}

export function resolveServerAccess(authState: ClerkAuthSnapshot): ServerAccessResolution {
  if (!authState.userId) {
    return {
      status: 'signed_out',
      destination: '/sign-in',
      orgId: null,
      orgRole: null,
      appRole: null,
    };
  }

  const orgId = resolveClerkOrgId(authState);
  const orgRole = resolveClerkOrgRole(authState);

  if (!orgId) {
    return {
      status: 'needs_onboarding',
      destination: '/onboarding',
      orgId: null,
      orgRole,
      appRole: null,
    };
  }

  if (orgRole) {
    const appRole = clerkRoleToAppRole(orgRole);
    if (appRole) {
      return {
        status: 'dashboard',
        destination: APP_ROLE_DASHBOARDS[appRole],
        orgId,
        orgRole,
        appRole,
      };
    }
  }

  return {
    status: 'unresolved_role',
    destination: null,
    orgId,
    orgRole,
    appRole: null,
  };
}
