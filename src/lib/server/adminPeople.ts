import { auth, clerkClient } from '@clerk/nextjs/server';
import { fetchMutation, fetchQuery } from 'convex/nextjs';
import { api } from '@/lib/convexApi';
import { upsertClerkUser, addMemberToClerkOrg, removeMemberFromClerkOrg } from './adminPeopleClerk';

type MembershipRole = 'owner_admin' | 'subadmin' | 'employee';
type ManagedRole = 'subadmin' | 'employee';

type ManagedMemberRecord = {
  membership: {
    _id: string;
    role: MembershipRole;
    siteIds: string[];
    teamIds: string[];
    status: string;
  };
  user: {
    _id: string;
    authUserId: string;
    email: string;
    name: string;
    phone?: string;
  };
};

export class AdminPeopleError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type CreatePersonInput = {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: ManagedRole;
  siteId: string;
  teamId?: string;
};

export type UpdatePersonInput = {
  name: string;
  email: string;
  phone: string;
  password?: string;
  siteId: string;
  teamId?: string;
};

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizePhone(value: string) {
  return value.trim();
}

type ClerkAuthContext = Awaited<ReturnType<typeof auth>>;
type ClerkGetToken = ClerkAuthContext['getToken'];

export async function resolveConvexTokenForRequest(params: {
  getToken: ClerkGetToken;
  sessionId: string | null;
}) {
  const { getToken, sessionId } = params;

  try {
    const token = await getToken({ template: 'convex' });
    if (token) {
      return token;
    }
  } catch (error) {
    if (process.env.PLAYWRIGHT_TEST !== '1' || !sessionId) {
      throw error;
    }
  }

  if (process.env.PLAYWRIGHT_TEST === '1' && sessionId) {
    const client = await clerkClient();
    const token = await client.sessions.getToken(sessionId, 'convex');
    return token.jwt;
  }

  return null;
}

export async function requireOwnerContext() {
  const { userId, sessionId, getToken } = await auth();

  if (!userId) {
    throw new AdminPeopleError(401, 'You need to be signed in to manage people.');
  }

  const token = await resolveConvexTokenForRequest({ getToken, sessionId });
  if (!token) {
    throw new AdminPeopleError(500, 'Unable to create a Convex auth token for this request.');
  }

  const active = await fetchQuery(api.organizations.active, {}, { token });
  if (!active?.membership) {
    throw new AdminPeopleError(403, 'No active organization is selected.');
  }

  if (active.membership.role !== 'owner_admin') {
    throw new AdminPeopleError(403, 'Only the organization owner can manage people.');
  }

  return { token, active };
}

export async function listManagedMembers(token: string) {
  return (await fetchQuery(api.memberships.listForActiveOrganization, {}, { token })) as ManagedMemberRecord[];
}

export async function getManagedMember(token: string, userId: string) {
  const members = await listManagedMembers(token);
  const target = members.find((entry) => String(entry.user._id) === userId);

  if (!target) {
    throw new AdminPeopleError(404, 'We could not find that person in the active organization.');
  }

  return target;
}

export async function createProvisionedPerson(input: CreatePersonInput) {
  const { token, active } = await requireOwnerContext();
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);

  if (!input.name.trim()) {
    throw new AdminPeopleError(400, 'Name is required.');
  }
  if (!email.includes('@')) {
    throw new AdminPeopleError(400, 'Enter a valid email address.');
  }
  if (!phone) {
    throw new AdminPeopleError(400, 'Phone number is required.');
  }
  if (input.password.trim().length < 8) {
    throw new AdminPeopleError(400, 'Password must be at least 8 characters.');
  }
  if (!input.siteId) {
    throw new AdminPeopleError(400, 'A site must be selected.');
  }

  const { user, created } = await upsertClerkUser({
    name: input.name,
    email,
    password: input.password,
  });

  try {
    const result = await fetchMutation(
      api.memberships.createProvisionedMember,
      {
        name: input.name.trim(),
        email,
        phone,
        role: input.role,
        siteIds: [input.siteId],
        teamIds: input.teamId ? [input.teamId] : [],
        authUserId: user.id,
      },
      { token },
    );

    // Also add the user to the Clerk organization with the correct role
    if (active?.organization) {
      const clerkOrgId = (active.organization as any).clerkOrgId;
      if (clerkOrgId) {
        await addMemberToClerkOrg(clerkOrgId, user.id, input.role);
      }
    }

    return result;
  } catch (error) {
    if (created) {
      const client = await clerkClient();
      await client.users.deleteUser(user.id).catch(() => undefined);
    }
    throw error;
  }
}

export async function updateProvisionedPerson(userId: string, input: UpdatePersonInput) {
  const { token } = await requireOwnerContext();
  const target = await getManagedMember(token, userId);
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);

  if (!input.name.trim()) {
    throw new AdminPeopleError(400, 'Name is required.');
  }
  if (!email.includes('@')) {
    throw new AdminPeopleError(400, 'Enter a valid email address.');
  }
  if (!phone) {
    throw new AdminPeopleError(400, 'Phone number is required.');
  }
  if (input.password && input.password.trim().length > 0 && input.password.trim().length < 8) {
    throw new AdminPeopleError(400, 'Password must be at least 8 characters.');
  }
  if (!input.siteId) {
    throw new AdminPeopleError(400, 'A site must be selected.');
  }

  const { user } = await upsertClerkUser({
    existingAuthUserId: target.user.authUserId,
    name: input.name,
    email,
    password: input.password?.trim() || undefined,
    previousEmail: target.user.email,
  });

  await fetchMutation(
    api.memberships.updateMember,
    {
      userId: target.user._id,
      name: input.name.trim(),
      email,
      phone,
    },
    { token },
  );

  await fetchMutation(
    api.memberships.reassignMember,
    {
      userId: target.user._id,
      siteIds: [input.siteId],
      teamIds: input.teamId ? [input.teamId] : [],
    },
    { token },
  );

  return {
    userId: target.user._id,
    authUserId: user.id,
    email,
    phone,
  };
}

export async function deleteProvisionedPerson(userId: string) {
  const { token, active } = await requireOwnerContext();
  const target = await getManagedMember(token, userId);
  const activeMembershipCount = (await fetchQuery(
    api.memberships.activeMembershipCountForUser,
    { userId: target.user._id },
    { token },
  )) as number;

  await fetchMutation(
    api.memberships.removeMember,
    { userId: target.user._id },
    { token },
  );

  // Remove from Clerk org
  if (active?.organization) {
    const clerkOrgId = (active.organization as any).clerkOrgId;
    if (clerkOrgId && target.user.authUserId && !target.user.authUserId.startsWith('pending:')) {
      await removeMemberFromClerkOrg(clerkOrgId, target.user.authUserId);
    }
  }

  if (
    activeMembershipCount <= 1 &&
    target.user.authUserId &&
    !target.user.authUserId.startsWith('pending:')
  ) {
    const client = await clerkClient();
    await client.users.deleteUser(target.user.authUserId).catch(() => undefined);
  }

  return { removed: true };
}
