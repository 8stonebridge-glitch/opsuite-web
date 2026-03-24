import { v } from "convex/values";
import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireCurrentUser, requireOwnerMembership, resolveActiveOrganizationFromIdentity, slugifyOrganizationName, resolveOrganizationByClerkId } from "./authHelpers";

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
  // Guard: if user already has an active membership, skip org creation
  // This prevents provisioned employees from accidentally becoming owners
  const existingMembership = await ctx.db
    .query("memberships")
    .withIndex("by_user_id", (q) => q.eq("userId", args.ownerUserId))
    .filter((q) => q.eq(q.field("status"), "active"))
    .first();

  if (existingMembership) {
    // User already belongs to an org — set it as active and return
    await ctx.db.patch(args.ownerUserId, {
      activeOrganizationId: existingMembership.organizationId,
      updatedAt: new Date().toISOString(),
    });
    return {
      organizationId: existingMembership.organizationId,
      membershipId: existingMembership._id,
      skipped: true,
    };
  }

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
    const { identity, user } = await requireCurrentUser(ctx);
    const activeOrganization = await resolveActiveOrganizationFromIdentity(ctx, identity);
    const activeOrganizationId = activeOrganization?._id ?? null;

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
              isActive: activeOrganizationId === organization._id,
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

    // PERSIST-GUARD: Prevent org creation for users who already belong to one.
    // Any active membership (owner, subadmin, or employee) blocks creation —
    // provisioned employees must not accidentally become owners.
    const existingMembership = await ctx.db
      .query("memberships")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (existingMembership) {
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

/**
 * Create a Convex organization linked to a Clerk Organization.
 * Called after the frontend creates the Clerk org via useOrganizationList().createOrganization().
 */
export const createFromClerkOrg = mutation({
  args: {
    clerkOrgId: v.string(),
    name: v.string(),
    industryId: v.optional(v.string()),
    mode: v.union(v.literal("managed"), v.literal("direct")),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);

    // Check if a Convex org already exists for this Clerk org
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();

    if (existing) {
      // Already linked — ensure user has active membership
      const membership = await ctx.db
        .query("memberships")
        .withIndex("by_organization_user", (q) =>
          q.eq("organizationId", existing._id).eq("userId", user._id),
        )
        .first();

      if (membership) {
        await ctx.db.patch(user._id, {
          activeOrganizationId: existing._id,
          updatedAt: new Date().toISOString(),
        });
        return { organizationId: existing._id, membershipId: membership._id };
      }
    }

    // Guard: prevent provisioned employees from creating a new org
    const existingMembership = await ctx.db
      .query("memberships")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (existingMembership) {
      await ctx.db.patch(user._id, {
        activeOrganizationId: existingMembership.organizationId,
        updatedAt: new Date().toISOString(),
      });
      return {
        organizationId: existingMembership.organizationId,
        membershipId: existingMembership._id,
      };
    }

    const now = new Date().toISOString();
    const slug = await uniqueOrganizationSlug(ctx, slugifyOrganizationName(args.name));

    const organizationId = await ctx.db.insert("organizations", {
      name: args.name.trim(),
      slug,
      industryId: args.industryId,
      mode: args.mode,
      ownerUserId: user._id,
      clerkOrgId: args.clerkOrgId,
      createdAt: now,
      updatedAt: now,
    });

    const membershipId = await ctx.db.insert("memberships", {
      userId: user._id,
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

    await ctx.db.patch(user._id, {
      activeOrganizationId: organizationId,
      updatedAt: now,
    });

    return { organizationId, membershipId };
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_auth_user_id", (q) => q.eq("authUserId", identity.subject))
      .first();

    if (!user) return null;

    const organization = await resolveActiveOrganizationFromIdentity(ctx, identity);

    if (!organization) return null;

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", organization!._id).eq("userId", user._id),
      )
      .unique();

    if (!membership || membership.status !== "active") {
      return null;
    }

    const settings = await ctx.db
      .query("orgSettings")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", organization!._id))
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
