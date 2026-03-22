import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireActiveOrganizationMembership } from "./authHelpers";

export const record = mutation({
  args: { milestone: v.string() },
  handler: async (ctx, args) => {
    const { organizationId, membership } = await requireActiveOrganizationMembership(ctx);

    const existing = await ctx.db
      .query("activationMilestones")
      .withIndex("by_membership_id", (q) => q.eq("membershipId", membership._id))
      .collect();

    if (existing.some((m) => m.milestone === args.milestone)) {
      return null;
    }

    return await ctx.db.insert("activationMilestones", {
      membershipId: membership._id,
      organizationId,
      milestone: args.milestone,
      completedAt: new Date().toISOString(),
    });
  },
});

export const listForMembership = query({
  args: {},
  handler: async (ctx) => {
    const { membership } = await requireActiveOrganizationMembership(ctx);

    const milestones = await ctx.db
      .query("activationMilestones")
      .withIndex("by_membership_id", (q) => q.eq("membershipId", membership._id))
      .collect();

    return milestones.sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  },
});

export const isComplete = query({
  args: { milestone: v.string() },
  handler: async (ctx, args) => {
    const { membership } = await requireActiveOrganizationMembership(ctx);

    const milestones = await ctx.db
      .query("activationMilestones")
      .withIndex("by_membership_id", (q) => q.eq("membershipId", membership._id))
      .collect();

    return milestones.some((m) => m.milestone === args.milestone);
  },
});
