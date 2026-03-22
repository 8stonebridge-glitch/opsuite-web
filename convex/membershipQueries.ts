import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";
import { requireActiveOrganizationMembership, requireOwnerMembership } from "./authHelpers";

async function getVisibleMemberships(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  membership: Doc<"memberships">,
) {
  if (membership.role === "employee") {
    return [membership];
  }

  const memberships = await ctx.db
    .query("memberships")
    .withIndex("by_organization_id", (q) => q.eq("organizationId", organizationId))
    .collect();

  if (membership.role === "owner_admin") {
    return memberships.filter((entry) => entry.status === "active");
  }

  return memberships.filter((entry) => {
    if (entry.status !== "active") return false;
    if (entry._id === membership._id) return true;
    if (entry.role === "owner_admin") return false;
    const sharesTeam = entry.teamIds.some((teamId) => membership.teamIds.includes(teamId));
    const sharesSite = entry.siteIds.some((siteId) => membership.siteIds.includes(siteId));
    return sharesTeam || sharesSite;
  });
}

export const listForActiveOrganization = query({
  args: {},
  handler: async (ctx) => {
    // Guard: return empty if user is not authenticated or has no active org
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_auth_user_id", (q) => q.eq("authUserId", identity.subject))
      .first();
    if (!user || !user.activeOrganizationId) return [];

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", user.activeOrganizationId!).eq("userId", user._id),
      )
      .first();
    if (!membership) return [];

    const organizationId = user.activeOrganizationId;

    const visibleMemberships = await getVisibleMemberships(ctx, organizationId, membership);

    const usersById = new Map(
      (await Promise.all(visibleMemberships.map((entry) => ctx.db.get(entry.userId))))
        .filter(Boolean)
        .map((user) => [user!._id, user!]),
    );

    return visibleMemberships
      .map((entry) => {
        const user = usersById.get(entry.userId);
        if (!user) return null;
        return { membership: entry, user };
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
