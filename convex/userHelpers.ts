import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { displayNameFromIdentity, requireIdentity } from "./authHelpers";
import { createOrganizationForOwner } from "./organizations";

/**
 * On sign-in, verify the user's activeOrganizationId still points to an org
 * where they have an active membership. If not, reset to their owned org.
 */
export async function maybeResetActiveOrganization(
  ctx: MutationCtx,
  userId: Id<"users">,
  currentActiveOrgId?: Id<"organizations">,
) {
  if (!currentActiveOrgId) return;

  const currentMembership = await ctx.db
    .query("memberships")
    .withIndex("by_organization_user", (q) =>
      q.eq("organizationId", currentActiveOrgId).eq("userId", userId),
    )
    .first();

  if (currentMembership && currentMembership.status === "active") {
    return;
  }

  const allMemberships = await ctx.db
    .query("memberships")
    .withIndex("by_user_id", (q) => q.eq("userId", userId))
    .collect();

  const ownedMembership = allMemberships.find(
    (m) => m.role === "owner_admin" && m.status === "active",
  );

  const fallbackMembership = ownedMembership || allMemberships.find((m) => m.status === "active");

  await ctx.db.patch(userId, {
    activeOrganizationId: fallbackMembership?.organizationId,
    updatedAt: new Date().toISOString(),
  });
}

export async function maybeClaimSignupDraft(
  ctx: MutationCtx,
  userId: Id<"users">,
  email: string,
) {
  const memberships = await ctx.db
    .query("memberships")
    .withIndex("by_user_id", (q) => q.eq("userId", userId))
    .collect();

  if (memberships.length > 0) {
    return;
  }

  const draft = await ctx.db
    .query("signupDrafts")
    .withIndex("by_email", (q) => q.eq("email", email))
    .first();

  if (!draft) {
    return;
  }

  await createOrganizationForOwner(ctx, {
    ownerUserId: userId,
    name: draft.organizationName,
    industryId: draft.industryId,
    mode: draft.mode,
  });

  await ctx.db.delete(draft._id);
}

export const syncFromAuthArgs = {
  clerkEmail: v.optional(v.string()),
  clerkName: v.optional(v.string()),
  clerkPhone: v.optional(v.string()),
  clerkAvatarUrl: v.optional(v.string()),
};

/** Resolve identity fields (email, name, phone, avatarUrl) from args + JWT. */
export function resolveIdentityFields(
  identity: Record<string, unknown>,
  args: { clerkEmail?: string; clerkName?: string; clerkPhone?: string; clerkAvatarUrl?: string },
) {
  const email = args.clerkEmail ||
    (typeof identity.email === "string" ? (identity.email as string).trim().toLowerCase() : "") ||
    (typeof (identity as any).emailAddress === "string" ? ((identity as any).emailAddress as string).trim().toLowerCase() : "");

  if (!email) {
    throw new Error("No email available. Call syncFromAuthAction instead.");
  }

  const name = args.clerkName || displayNameFromIdentity(identity);
  const phone = args.clerkPhone?.trim() || undefined;
  const avatarUrl = args.clerkAvatarUrl ||
    (typeof identity.pictureUrl === "string" ? identity.pictureUrl : undefined);

  return { email, name, phone, avatarUrl };
}

/** Update an existing user record and handle draft/org claims. */
export async function updateExistingUser(
  ctx: MutationCtx,
  userId: Id<"users">,
  fields: {
    authUserId?: string;
    email: string;
    name: string;
    phone?: string;
    avatarUrl?: string;
  },
  activeOrgId?: Id<"organizations">,
) {
  const now = new Date().toISOString();

  await ctx.db.patch(userId, {
    ...fields,
    ...(fields.phone ? { phone: fields.phone } : {}),
    updatedAt: now,
  });

  await maybeClaimSignupDraft(ctx, userId, fields.email);
  await maybeResetActiveOrganization(ctx, userId, activeOrgId);
  return { now };
}

/** Backfill activeOrganizationId if it ended up unset after update. */
export async function backfillActiveOrg(
  ctx: MutationCtx,
  userId: Id<"users">,
) {
  const refreshed = await ctx.db.get(userId);
  if (refreshed && !refreshed.activeOrganizationId) {
    const firstMembership = await ctx.db
      .query("memberships")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (firstMembership && firstMembership.status === "active") {
      await ctx.db.patch(userId, {
        activeOrganizationId: firstMembership.organizationId,
        updatedAt: new Date().toISOString(),
      });
    }
  }
}

/** Core handler for syncFromAuth mutation and internalMutation. */
export async function syncFromAuthHandler(
  ctx: MutationCtx,
  args: { clerkEmail?: string; clerkName?: string; clerkPhone?: string; clerkAvatarUrl?: string },
) {
  const identity = await requireIdentity(ctx);
  const authUserId = identity.subject;

  const { email, name, phone, avatarUrl } = resolveIdentityFields(
    identity as unknown as Record<string, unknown>,
    args,
  );

  const existing = await ctx.db
    .query("users")
    .withIndex("by_auth_user_id", (q) => q.eq("authUserId", authUserId))
    .first();

  if (existing) {
    await updateExistingUser(ctx, existing._id, { email, name, phone, avatarUrl }, existing.activeOrganizationId);
    return await ctx.db.get(existing._id);
  }

  const existingByEmail = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .first();

  if (existingByEmail) {
    await updateExistingUser(ctx, existingByEmail._id, { authUserId, email, name, phone, avatarUrl }, existingByEmail.activeOrganizationId);
    await backfillActiveOrg(ctx, existingByEmail._id);
    return await ctx.db.get(existingByEmail._id);
  }

  const now = new Date().toISOString();
  const userId = await ctx.db.insert("users", {
    authUserId,
    email,
    name,
    phone,
    avatarUrl,
    createdAt: now,
    updatedAt: now,
  });

  await maybeClaimSignupDraft(ctx, userId, email);
  return await ctx.db.get(userId);
}
