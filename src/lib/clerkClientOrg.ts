export interface ClerkMembershipLike {
  organization: {
    id: string;
  };
  role?: string | null;
}

interface ResolveClientClerkOrgArgs {
  activeOrgId?: string | null;
  membershipRole?: string | null;
  organizationMemberships?: ClerkMembershipLike[] | null;
}

function getSingleMembership(
  organizationMemberships: ClerkMembershipLike[] | null | undefined,
): ClerkMembershipLike | null {
  return organizationMemberships?.length === 1 ? organizationMemberships[0] : null;
}

export function resolveClientClerkOrgId({
  activeOrgId,
  organizationMemberships,
}: ResolveClientClerkOrgArgs): string | null {
  if (typeof activeOrgId === 'string' && activeOrgId.length > 0) {
    return activeOrgId;
  }

  const singleMembership = getSingleMembership(organizationMemberships);
  return singleMembership?.organization.id ?? null;
}

export function resolveClientClerkOrgRole({
  activeOrgId,
  membershipRole,
  organizationMemberships,
}: ResolveClientClerkOrgArgs): string | null {
  if (typeof membershipRole === 'string' && membershipRole.length > 0) {
    return membershipRole;
  }

  if (activeOrgId && organizationMemberships) {
    const matchingMembership = organizationMemberships.find(
      (membership) => membership.organization.id === activeOrgId,
    );
    if (typeof matchingMembership?.role === 'string' && matchingMembership.role.length > 0) {
      return matchingMembership.role;
    }
  }

  const singleMembership = getSingleMembership(organizationMemberships);
  return typeof singleMembership?.role === 'string' && singleMembership.role.length > 0
    ? singleMembership.role
    : null;
}
