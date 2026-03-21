import { v } from "convex/values";
import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireCurrentUser, requireOwnerMembership, slugifyOrganizationName } from "./authHelpers";

/** One-time bootstrap: create org + membership for an existing user (no auth required).
 *  Call via: npx convex run organizations:bootstrapOwner --prod '{"userId":"...","orgName":"..."}' */
export const bootstrapOwner = internalMutation({
  args: {
    userId: v.id("users"),
    orgName: v.string(),
    industryId: v.optional(v.string()),
    mode: v.optional(v.union(v.literal("managed"), v.literal("direct"))),
  },
  handler: async (ctx, args) => {
    return await createOrganizationForOwner(ctx, {
      ownerUserId: args.userId,
      name: args.orgName,
      industryId: args.industryId,
      mode: args.mode ?? "managed",
    });
  },
});

async function uniqueOrganizationSlug(ctx: MutationCtx | QueryCtx, base: string) {
  let candidate = base;
  let counter = 1;

  while (true) {
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", candidate))
      .unique();
    if (!existing) return candidate;
    counter += 1;
    candidate = `${base}-${counter}`;
  }
}

export async function createOrganizationForOwner(
  ctx: MutationCtx,
  args: {
    ownerUserId: Id<"users">;
    name: string;
    industryId?: string;
    mode: "managed" | "direct";
  },
) {
  const now = new Date().toISOString();
  const slug = await uniqueOrganizationSlug(ctx, slugifyOrganizationName(args.name));

  const organizationId = await ctx.db.insert("organizations", {
    name: args.name.trim(),
    slug,
    industryId: args.industryId,
    mode: args.mode,
    ownerUserId: args.ownerUserId,
    createdAt: now,
    updatedAt: now,
  });

  const membershipId = await ctx.db.insert("memberships", {
    userId: args.ownerUserId,
    organizationId,
    role: "owner_admin",
    siteIds: [],
    teamIds: [],
    status: "active",
    joinedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  await ctx.db.insert("orgSettings", {
    organizationId,
    noChangeAlertWorkdays: 3,
    reworkAlertCycles: 3,
    createdAt: now,
    updatedAt: now,
  });

  await ctx.db.patch(args.ownerUserId, {
    activeOrganizationId: organizationId,
    updatedAt: now,
  });

  return {
    organizationId,
    membershipId,
  };
}

export const listForViewer = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireCurrentUser(ctx);

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .collect();

    const activeMemberships = memberships.filter((membership) => membership.status === "active");

    const organizations = await Promise.all(
      activeMemberships.map(async (membership) => {
        const organization = await ctx.db.get(membership.organizationId);
        return organization
          ? {
              organization,
              membership,
              isActive: user.activeOrganizationId === organization._id,
            }
          : null;
      }),
    );

    return organizations.filter(Boolean);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    industryId: v.optional(v.string()),
    mode: v.union(v.literal("managed"), v.literal("direct")),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);

    // PERSIST-GUARD: Prevent duplicate org creation.
    // If the user already owns an organization, return the existing one
    // instead of creating a duplicate.
    const existingMembership = await ctx.db
      .query("memberships")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("role"), "owner_admin"))
      .first();

    if (existingMembership && existingMembership.status === "active") {
      const existingOrg = await ctx.db.get(existingMembership.organizationId);
      if (existingOrg) {
        // Ensure activeOrganizationId is set (may have been cleared)
        if (user.activeOrganizationId !== existingOrg._id) {
          await ctx.db.patch(user._id, {
            activeOrganizationId: existingOrg._id,
            updatedAt: new Date().toISOString(),
          });
        }
        return {
          organizationId: existingOrg._id,
          membershipId: existingMembership._id,
        };
      }
    }

    return await createOrganizationForOwner(ctx, {
      ownerUserId: user._id,
      name: args.name,
      industryId: args.industryId,
      mode: args.mode,
    });
  },
});

export const storeSignupDraft = mutation({
  args: {
    email: v.string(),
    organizationName: v.string(),
    industryId: v.optional(v.string()),
    mode: v.union(v.literal("managed"), v.literal("direct")),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const normalizedEmail = args.email.trim().toLowerCase();

    const existing = await ctx.db
      .query("signupDrafts")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        organizationName: args.organizationName.trim(),
        industryId: args.industryId,
        mode: args.mode,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("signupDrafts", {
      email: normalizedEmail,
      organizationName: args.organizationName.trim(),
      industryId: args.industryId,
      mode: args.mode,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const active = query({
  args: {},
  handler: async (ctx) => {
    // Use getUserIdentity directly so we never throw for unauthenticated or
    // not-yet-bootstrapped users — both cases just return null gracefully.
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_auth_user_id", (q) => q.eq("authUserId", identity.subject))
      .first();

    // User not bootstrapped in Convex yet (syncFromAuth hasn't run) — return null,
    // ConvexDataBridge will call syncFromAuth and the query will re-run reactively.
    if (!user) return null;
    if (!user.activeOrganizationId) return null;

    const organization = await ctx.db.get(user.activeOrganizationId);
    if (!organization) return null;

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", user.activeOrganizationId!).eq("userId", user._id),
      )
      .unique();

    // Only return the active org if the user has a valid, active membership
    if (!membership || membership.status !== "active") {
      return null;
    }

    const settings = await ctx.db
      .query("orgSettings")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", user.activeOrganizationId!))
      .unique();

    return {
      organization,
      membership,
      settings,
    };
  },
});

/** One-time backfill — internal only, not callable from client browsers */
export const backfillMode = internalMutation({
  args: {
    mode: v.union(v.literal("managed"), v.literal("direct")),
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("organizations").collect();
    let patched = 0;
    for (const org of all) {
      if (args.force || (org as any).mode !== args.mode) {
        await ctx.db.patch(org._id, { mode: args.mode, updatedAt: new Date().toISOString() });
        patched++;
      }
    }
    return { patched, total: all.length };
  },
});

/** Update the mode of the caller's active organization (owner only). */
export const updateMode = mutation({
  args: {
    mode: v.union(v.literal("managed"), v.literal("direct")),
  },
  handler: async (ctx, args) => {
    const { organization } = await requireOwnerMembership(ctx);
    await ctx.db.patch(organization._id, { mode: args.mode, updatedAt: new Date().toISOString() });
    return { id: organization._id, mode: args.mode };
  },
});
