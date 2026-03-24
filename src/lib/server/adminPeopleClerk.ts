import { clerkClient } from '@clerk/nextjs/server';
import { normalizeEmail, AdminPeopleError } from './adminPeople';

type ClerkOrgRole = 'org:owner_admin' | 'org:subadmin' | 'org:employee';

/** Map Convex role to Clerk org role key */
function toClerkOrgRole(role: string): ClerkOrgRole {
  switch (role) {
    case 'owner_admin': return 'org:owner_admin';
    case 'subadmin': return 'org:subadmin';
    case 'employee': return 'org:employee';
    default: return 'org:employee';
  }
}

/** Add a user to a Clerk organization with the specified role */
export async function addMemberToClerkOrg(clerkOrgId: string, clerkUserId: string, role: string) {
  const client = await clerkClient();
  try {
    await client.organizations.createOrganizationMembership({
      organizationId: clerkOrgId,
      userId: clerkUserId,
      role: toClerkOrgRole(role),
    });
  } catch (err: any) {
    // If already a member, update role instead
    if (err?.errors?.[0]?.code === 'duplicate_record') {
      await client.organizations.updateOrganizationMembership({
        organizationId: clerkOrgId,
        userId: clerkUserId,
        role: toClerkOrgRole(role),
      });
    } else {
      throw err;
    }
  }
}

/** Remove a user from a Clerk organization */
export async function removeMemberFromClerkOrg(clerkOrgId: string, clerkUserId: string) {
  const client = await clerkClient();
  try {
    await client.organizations.deleteOrganizationMembership({
      organizationId: clerkOrgId,
      userId: clerkUserId,
    });
  } catch {
    // Ignore if not a member
  }
}

export async function findClerkUserByEmail(email: string) {
  const client = await clerkClient();
  const result = await client.users.getUserList({ emailAddress: [email], limit: 1 });
  return result.data[0] ?? null;
}

export async function ensurePrimaryEmail(
  userId: string,
  nextEmail: string,
  previousEmail?: string,
) {
  const client = await clerkClient();
  let user = await client.users.getUser(userId);

  let target = user.emailAddresses.find(
    (entry) => normalizeEmail(entry.emailAddress) === nextEmail,
  );

  if (!target) {
    target = await client.emailAddresses.createEmailAddress({
      userId,
      emailAddress: nextEmail,
      verified: true,
      primary: true,
    });
  } else {
    target = await client.emailAddresses.updateEmailAddress(target.id, {
      verified: true,
      primary: true,
    });
  }

  // Only remove the previous primary email (if provided and different from the new one).
  // Without a known previousEmail we cannot safely identify which address to clean up,
  // so we remove nothing rather than risk deleting unrelated emails.
  const removableEmailIds = previousEmail
    ? user.emailAddresses
        .filter((entry) => normalizeEmail(entry.emailAddress) !== nextEmail)
        .filter((entry) => normalizeEmail(entry.emailAddress) === normalizeEmail(previousEmail))
        .map((entry) => entry.id)
    : [];

  for (const emailId of removableEmailIds) {
    try {
      await client.emailAddresses.deleteEmailAddress(emailId);
    } catch {
      // Keep going if Clerk refuses deletion because of policy/state.
    }
  }

  user = await client.users.getUser(userId);
  return user;
}

export async function upsertClerkUser(params: {
  name: string;
  email: string;
  password?: string;
  existingAuthUserId?: string;
  previousEmail?: string;
}) {
  const client = await clerkClient();
  const trimmed = params.name.trim();
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const firstName = parts[0] || trimmed;
  const lastName = parts.length > 1 ? parts.slice(1).join(' ') : undefined;

  let user =
    (params.existingAuthUserId && !params.existingAuthUserId.startsWith('pending:')
      ? await client.users.getUser(params.existingAuthUserId).catch(() => null)
      : null) ||
    (await findClerkUserByEmail(params.email));

  let created = false;

  if (!user) {
    if (!params.password) {
      throw new AdminPeopleError(400, 'A password is required when creating a new person.');
    }

    user = await client.users.createUser({
      emailAddress: [params.email],
      password: params.password,
      firstName,
      lastName,
      skipLegalChecks: true,
    });
    created = true;
  } else {
    user = await client.users.updateUser(user.id, {
      firstName,
      lastName,
      ...(params.password ? { password: params.password, signOutOfOtherSessions: true } : {}),
    });
  }

  user = await ensurePrimaryEmail(user.id, params.email, params.previousEmail);

  return { user, created };
}
