import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
// Doc is used for organization type annotation in dual-read helpers

type AuthCtx = QueryCtx | MutationCtx;

export async function requireIdentity(ctx: AuthCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated");
  }
  return identity;
}

export async function getCurrentUser(ctx: AuthCtx) {
  const identity = await requireIdentity(ctx);
  const user = await ctx.db
    .query("users")
    .withIndex("by_auth_user_id", (q) => q.eq("authUserId", identity.subject))
    .first();

  return { identity, user };
}

export async function requireCurrentUser(ctx: AuthCtx) {
  const { identity, user } = await getCurrentUser(ctx);
  if (!user) {
    throw new Error("User record not initialized");
  }
  return { identity, user };
}

export async function requireActiveOrganizationMembership(ctx: AuthCtx) {
  const { identity, user } = await requireCurrentUser(ctx);

  // Try Clerk org_id from JWT first, fall back to user.activeOrganizationId
  const clerkOrgId = (identity as any).org_id as string | undefined;
  let organization: Doc<"organizations"> | null = null;

  if (clerkOrgId) {
    organization = await resolveOrganizationByClerkId(ctx, clerkOrgId);
  }

  if (!organization && user.activeOrganizationId) {
    organization = await ctx.db.get(user.activeOrganizationId);
  }

  if (!organization) {
    throw new Error("No active organization selected");
  }

  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_organization_user", (q) =>
      q.eq("organizationId", organization!._id).eq("userId", user._id),
    )
    .first();

  if (!membership || membership.status !== "active") {
    throw new Error("You do not have access to the active organization");
  }

  return {
    identity,
    user,
    organization,
    membership,
    organizationId: organization._id as Id<"organizations">,
  };
}

/**
 * Safe version of requireActiveOrganizationMembership for queries called
 * from the client via useQuery. Returns null instead of throwing when
 * auth is not ready, user has no org, or membership is missing.
 * Use this in any query that renders on page load.
 */
export async function getActiveOrganizationMembership(ctx: AuthCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const user = await ctx.db
    .query("users")
    .withIndex("by_auth_user_id", (q) => q.eq("authUserId", identity.subject))
    .first();
  if (!user) return null;

  // Try Clerk org_id from JWT first, fall back to user.activeOrganizationId
  const clerkOrgId = (identity as any).org_id as string | undefined;
  let organization: Doc<"organizations"> | null = null;

  if (clerkOrgId) {
    organization = await resolveOrganizationByClerkId(ctx, clerkOrgId);
  }

  if (!organization && user.activeOrganizationId) {
    organization = await ctx.db.get(user.activeOrganizationId);
  }

  if (!organization) return null;

  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_organization_user", (q) =>
      q.eq("organizationId", organization!._id).eq("userId", user._id),
    )
    .first();
  if (!membership || membership.status !== "active") return null;

  return {
    identity,
    user,
    organization,
    membership,
    organizationId: organization._id as Id<"organizations">,
  };
}

export async function requireOwnerMembership(ctx: AuthCtx) {
  const access = await requireActiveOrganizationMembership(ctx);
  if (access.membership.role !== "owner_admin") {
    throw new Error("Only the organization owner can perform this action");
  }
  return access;
}

export function displayNameFromIdentity(identity: Record<string, unknown>) {
  const name = typeof identity.name === "string" ? identity.name.trim() : "";
  if (name) return name;

  const givenName = typeof identity.givenName === "string" ? identity.givenName.trim() : "";
  const familyName = typeof identity.familyName === "string" ? identity.familyName.trim() : "";
  const joined = [givenName, familyName].filter(Boolean).join(" ").trim();
  if (joined) return joined;

  const email = typeof identity.email === "string" ? identity.email.trim() : "";
  if (email) return email;

  return "User";
}

export function emailFromIdentity(identity: Record<string, unknown>) {
  // Clerk may expose the email as "email" or "emailAddress" depending on the JWT template
  const email =
    (typeof identity.email === "string" ? identity.email.trim().toLowerCase() : "") ||
    (typeof identity.emailAddress === "string" ? identity.emailAddress.trim().toLowerCase() : "");
  if (!email) {
    console.error("Identity fields available:", Object.keys(identity));
    throw new Error("Authenticated identity is missing an email address");
  }
  return email;
}

/**
 * Resolve a Convex organization document by its linked Clerk org ID.
 * Returns null if no match found.
 */
export async function resolveOrganizationByClerkId(ctx: AuthCtx, clerkOrgId: string) {
  return await ctx.db
    .query("organizations")
    .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", clerkOrgId))
    .first();
}

export function slugifyOrganizationName(name: string) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base || "organization";
}
