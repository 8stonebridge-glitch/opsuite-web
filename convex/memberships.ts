import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, type MutationCtx } from "./_generated/server";
import { requireOwnerMembership } from "./authHelpers";
import {
  validateAssignments,
  syncSubadminTeamAssignments,
  upsertUserByEmail,
} from "./membershipHelpers";

// Re-export queries so api.memberships.* stays unchanged
export { listForActiveOrganization, activeMembershipCountForUser } from "./membershipQueries";

export const createProvisionedMember = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    role: v.union(v.literal("subadmin"), v.literal("employee")),
    siteIds: v.array(v.id("sites")),
    teamIds: v.array(v.id("teams")),
    authUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId, user: ownerUser } = await requireOwnerMembership(ctx);

    const normalizedEmail = args.email.trim().toLowerCase();
    const trimmedName = args.name.trim();
    const trimmedPhone = args.phone.trim();

    if (!normalizedEmail) throw new Error("An email address is required");
    if (!trimmedName) throw new Error("A member name is required");
    if (!trimmedPhone) throw new Error("A phone number is required");

    await validateAssignments(ctx, organizationId, args.siteIds, args.teamIds);

    const user = await upsertUserByEmail(ctx, {
      email: normalizedEmail,
      name: trimmedName,
      phone: trimmedPhone,
      authUserId: args.authUserId,
    });

    const membership = await upsertMembership(ctx, {
      userId: user._id,
      organizationId,
      role: args.role,
      siteIds: args.siteIds,
      teamIds: args.teamIds,
      invitedByUserId: ownerUser._id,
    });

    return { user: await ctx.db.get(user._id), membership };
  },
});

async function upsertMembership(
  ctx: MutationCtx,
  opts: {
    userId: Id<"users">;
    organizationId: Id<"organizations">;
    role: "subadmin" | "employee";
    siteIds: Id<"sites">[];
    teamIds: Id<"teams">[];
    invitedByUserId: Id<"users">;
  },
) {
  const now = new Date().toISOString();

  const existing = await ctx.db
    .query("memberships")
    .withIndex("by_organization_user", (q) =>
      q.eq("organizationId", opts.organizationId).eq("userId", opts.userId),
    )
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, {
      role: opts.role,
      siteIds: opts.siteIds,
      teamIds: opts.teamIds,
      status: "active",
      updatedAt: now,
    });
    const refreshed = (await ctx.db.get(existing._id))!;
    await syncSubadminTeamAssignments(ctx, opts.organizationId, refreshed, opts.teamIds);
    return refreshed;
  }

  const id = await ctx.db.insert("memberships", {
    userId: opts.userId,
    organizationId: opts.organizationId,
    role: opts.role,
    siteIds: opts.siteIds,
    teamIds: opts.teamIds,
    status: "active",
    invitedByUserId: opts.invitedByUserId,
    joinedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  const inserted = (await ctx.db.get(id))!;
  await syncSubadminTeamAssignments(ctx, opts.organizationId, inserted, opts.teamIds);
  return inserted;
}

/** Remove a member from the organization -- owner only (soft-delete via status) */
export const removeMember = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { organizationId, user: ownerUser } = await requireOwnerMembership(ctx);

    if (args.userId === ownerUser._id) {
      throw new Error("You cannot remove yourself");
    }

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", organizationId).eq("userId", args.userId),
      )
      .unique();

    if (!membership) {
      throw new Error("User is not a member of this organization");
    }

    const now = new Date().toISOString();
    await syncSubadminTeamAssignments(ctx, organizationId, membership, []);
    await ctx.db.patch(membership._id, {
      status: "suspended",
      teamIds: [],
      siteIds: [],
      updatedAt: now,
    });

    return { removed: true };
  },
});

/** Reassign a member to different teams/sites -- owner only */
export const reassignMember = mutation({
  args: {
    userId: v.id("users"),
    teamIds: v.array(v.id("teams")),
    siteIds: v.array(v.id("sites")),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireOwnerMembership(ctx);

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", organizationId).eq("userId", args.userId),
      )
      .unique();

    if (!membership || membership.status !== "active") {
      throw new Error("User is not a member of this organization");
    }

    await validateAssignments(ctx, organizationId, args.siteIds, args.teamIds);

    const now = new Date().toISOString();
    await ctx.db.patch(membership._id, {
      teamIds: args.teamIds,
      siteIds: args.siteIds,
      updatedAt: now,
    });

    const refreshed = (await ctx.db.get(membership._id))!;
    await syncSubadminTeamAssignments(ctx, organizationId, refreshed, args.teamIds);
    return refreshed;
  },
});

/** Update an existing member's profile (name, email) -- owner only */
export const updateMember = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireOwnerMembership(ctx);

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", organizationId).eq("userId", args.userId),
      )
      .unique();

    if (!membership || membership.status !== "active") {
      throw new Error("User is not a member of this organization");
    }

    // We intentionally patch the *users* table (not memberships) here because
    // name, email, and phone are user-profile fields that live on the users table.
    // The membership lookup above serves as an authorization check — it confirms
    // the target user belongs to the caller's organization and is active.
    const now = new Date().toISOString();
    const updates: Record<string, string> = { updatedAt: now };
    if (args.name) updates.name = args.name.trim();
    if (args.email) updates.email = args.email.trim().toLowerCase();
    if (args.phone) updates.phone = args.phone.trim();

    await ctx.db.patch(args.userId, updates);
    return await ctx.db.get(args.userId);
  },
});
