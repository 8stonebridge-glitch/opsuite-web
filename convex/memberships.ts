import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { requireActiveOrganizationMembership, requireOwnerMembership } from "./authHelpers";

async function validateAssignments(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  siteIds: Id<"sites">[],
  teamIds: Id<"teams">[],
) {
  if (siteIds.length === 0) {
    throw new Error("Every person must be linked to a site");
  }

  for (const siteId of siteIds) {
    const site = await ctx.db.get(siteId);
    if (!site || site.organizationId !== organizationId) {
      throw new Error("One of the selected sites does not belong to the active organization");
    }
  }

  for (const teamId of teamIds) {
    const team = await ctx.db.get(teamId);
    if (!team || team.organizationId !== organizationId) {
      throw new Error("One of the selected teams does not belong to the active organization");
    }
    if (team.siteId && !siteIds.some((siteId) => String(siteId) === String(team.siteId))) {
      throw new Error("Selected team must belong to the selected site");
    }
  }
}

async function syncSubadminTeamAssignments(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  membership: Pick<Doc<"memberships">, "_id" | "role">,
  nextTeamIds: Id<"teams">[],
) {
  const organizationTeams = await ctx.db
    .query("teams")
    .withIndex("by_organization_id", (q) => q.eq("organizationId", organizationId))
    .collect();

  const nextTeamSet = new Set(nextTeamIds.map((teamId) => String(teamId)));
  const now = new Date().toISOString();

  for (const team of organizationTeams) {
    const currentlyOwnedByMember = team.subadminMembershipId && String(team.subadminMembershipId) === String(membership._id);

    if (currentlyOwnedByMember && (membership.role !== "subadmin" || !nextTeamSet.has(String(team._id)))) {
      await ctx.db.patch(team._id, {
        subadminMembershipId: undefined,
        updatedAt: now,
      });
    }
  }

  if (membership.role !== "subadmin") {
    return;
  }

  for (const teamId of nextTeamSet) {
    const team = organizationTeams.find((entry) => String(entry._id) === teamId);
    if (!team) continue;

    if (team.subadminMembershipId && String(team.subadminMembershipId) !== String(membership._id)) {
      throw new Error("One of the selected teams is already linked to another subadmin");
    }

    if (String(team.subadminMembershipId) !== String(membership._id)) {
      await ctx.db.patch(team._id, {
        subadminMembershipId: membership._id,
        updatedAt: now,
      });
    }
  }
}

export const listForActiveOrganization = query({
  args: {},
  handler: async (ctx) => {
    const { organizationId, membership } = await requireActiveOrganizationMembership(ctx);

    let visibleMemberships;

    if (membership.role === "employee") {
      // Employees only need their own membership — no full org scan
      visibleMemberships = [membership];
    } else {
      const memberships = await ctx.db
        .query("memberships")
        .withIndex("by_organization_id", (q) => q.eq("organizationId", organizationId))
        .collect();

      visibleMemberships =
        membership.role === "owner_admin"
          ? memberships.filter((entry) => entry.status === "active")
          : memberships.filter((entry) => {
              if (entry.status !== "active") return false;
              if (entry._id === membership._id) return true;
              if (entry.role === "owner_admin") return false;

              const sharesTeam = entry.teamIds.some((teamId) => membership.teamIds.includes(teamId));
              const sharesSite = entry.siteIds.some((siteId) => membership.siteIds.includes(siteId));
              return sharesTeam || sharesSite;
            });
    }

    const usersById = new Map(
      (
        await Promise.all(visibleMemberships.map((entry) => ctx.db.get(entry.userId)))
      )
        .filter(Boolean)
        .map((user) => [user!._id, user!]),
    );

    return visibleMemberships
      .map((entry) => {
        const user = usersById.get(entry.userId);
        if (!user) return null;
        return {
          membership: entry,
          user,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a!.user.name.localeCompare(b!.user.name));
  },
});

export const activeMembershipCountForUser = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireOwnerMembership(ctx);

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();

    return memberships.filter((entry) => entry.status === "active").length;
  },
});

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

    if (!normalizedEmail) {
      throw new Error("An email address is required");
    }

    if (!trimmedName) {
      throw new Error("A member name is required");
    }

    if (!trimmedPhone) {
      throw new Error("A phone number is required");
    }

    await validateAssignments(ctx, organizationId, args.siteIds, args.teamIds);

    const now = new Date().toISOString();

    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .unique();

    if (user) {
      await ctx.db.patch(user._id, {
        ...(args.authUserId ? { authUserId: args.authUserId } : {}),
        name: trimmedName,
        phone: trimmedPhone,
        updatedAt: now,
      });
      user = (await ctx.db.get(user._id))!;
    } else {
      const userId = await ctx.db.insert("users", {
        authUserId: args.authUserId || `pending:${normalizedEmail}`,
        email: normalizedEmail,
        name: trimmedName,
        phone: trimmedPhone,
        createdAt: now,
        updatedAt: now,
      });
      user = (await ctx.db.get(userId))!;
    }

    const existingMembership = await ctx.db
      .query("memberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", organizationId).eq("userId", user._id),
      )
      .unique();

    if (existingMembership) {
      await ctx.db.patch(existingMembership._id, {
        role: args.role,
        siteIds: args.siteIds,
        teamIds: args.teamIds,
        status: "active",
        updatedAt: now,
      });

      const refreshedMembership = (await ctx.db.get(existingMembership._id))!;
      await syncSubadminTeamAssignments(ctx, organizationId, refreshedMembership, args.teamIds);

      return {
        user: await ctx.db.get(user._id),
        membership: refreshedMembership,
      };
    }

    const membershipId = await ctx.db.insert("memberships", {
      userId: user._id,
      organizationId,
      role: args.role,
      siteIds: args.siteIds,
      teamIds: args.teamIds,
      status: "active",
      invitedByUserId: ownerUser._id,
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const insertedMembership = (await ctx.db.get(membershipId))!;
    await syncSubadminTeamAssignments(ctx, organizationId, insertedMembership, args.teamIds);

    return {
      user: await ctx.db.get(user._id),
      membership: insertedMembership,
    };
  },
});

/** Remove a member from the organization — owner only (soft-delete via status) */
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

/** Reassign a member to different teams/sites — owner only */
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

    const refreshedMembership = (await ctx.db.get(membership._id))!;
    await syncSubadminTeamAssignments(ctx, organizationId, refreshedMembership, args.teamIds);

    return refreshedMembership;
  },
});

/** Update an existing member's profile (name, email) — owner only */
export const updateMember = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireOwnerMembership(ctx);

    // Ensure the target user is in this org
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", organizationId).eq("userId", args.userId),
      )
      .unique();

    if (!membership || membership.status !== "active") {
      throw new Error("User is not a member of this organization");
    }

    const now = new Date().toISOString();
    const updates: Record<string, string> = { updatedAt: now };
    if (args.name) updates.name = args.name.trim();
    if (args.email) updates.email = args.email.trim().toLowerCase();
    if (args.phone) updates.phone = args.phone.trim();

    await ctx.db.patch(args.userId, updates);
    return await ctx.db.get(args.userId);
  },
});
