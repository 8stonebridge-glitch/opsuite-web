import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchMutation, fetchQuery } from 'convex/nextjs';
import { api } from '@/lib/convexApi';

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

export async function requireOwnerContext() {
  const token = await convexAuthNextjsToken();

  if (!token) {
    throw new AdminPeopleError(401, 'You need to be signed in to manage people.');
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
  const { token } = await requireOwnerContext();
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

  // With Convex Auth, user provisioning is handled entirely through Convex
  // mutations. The createProvisionedMember mutation will upsert the user
  // record. The provisioned user can later sign in via the Password provider
  // which will link their auth account.
  const result = await fetchMutation(
    api.memberships.createProvisionedMember,
    {
      name: input.name.trim(),
      email,
      phone,
      role: input.role,
      siteIds: [input.siteId],
      teamIds: input.teamId ? [input.teamId] : [],
    },
    { token },
  );

  return result;
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

  // Update user profile in Convex directly (no external auth provider needed)
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
    authUserId: target.user.authUserId,
    email,
    phone,
  };
}

export async function deleteProvisionedPerson(userId: string) {
  const { token } = await requireOwnerContext();
  const target = await getManagedMember(token, userId);

  // Remove the membership via Convex mutation.
  // With Convex Auth, user/auth account cleanup is handled server-side
  // within the Convex backend if needed.
  await fetchMutation(
    api.memberships.removeMember,
    { userId: target.user._id },
    { token },
  );

  return { removed: true };
}
