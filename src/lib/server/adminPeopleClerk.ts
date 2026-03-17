import { clerkClient } from '@clerk/nextjs/server';
import { normalizeEmail, AdminPeopleError } from './adminPeople';

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

  const removableEmailIds = user.emailAddresses
    .filter((entry) => normalizeEmail(entry.emailAddress) !== nextEmail)
    .filter((entry) => !previousEmail || normalizeEmail(entry.emailAddress) === normalizeEmail(previousEmail))
    .map((entry) => entry.id);

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
