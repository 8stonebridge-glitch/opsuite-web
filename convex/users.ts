import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { requireCurrentUser } from "./authHelpers";
import {
  syncFromAuthArgs,
  syncFromAuthHandler,
} from "./userHelpers";

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // Try by authUserId first, then fall back to email
    let user = await ctx.db
      .query("users")
      .withIndex("by_auth_user_id", (q) => q.eq("authUserId", identity.subject))
      .first();

    if (!user && typeof identity.email === "string") {
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", identity.email as string))
        .first();
    }

    return {
      identity: {
        subject: identity.subject,
        issuer: identity.issuer,
        email: typeof identity.email === "string" ? identity.email : null,
        name: typeof identity.name === "string" ? identity.name : null,
      },
      user,
    };
  },
});

// Public mutation — syncs identity into the users table on sign-in
export const syncFromAuth = mutation({
  args: syncFromAuthArgs,
  handler: syncFromAuthHandler,
});

// Internal mutation (for internal calls)
export const syncFromAuthInternal = internalMutation({
  args: syncFromAuthArgs,
  handler: syncFromAuthHandler,
});

export const setActiveOrganization = mutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id),
      )
      .first();

    if (!membership || membership.status !== "active") {
      throw new Error("You do not have access to that organization");
    }

    await ctx.db.patch(user._id, {
      activeOrganizationId: args.organizationId,
      updatedAt: new Date().toISOString(),
    });

    return await ctx.db.get(user._id);
  },
});

// Internal only — not callable from client browsers
export const debugListAll = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map((u) => ({
      id: u._id,
      email: u.email,
      authUserId: u.authUserId,
      activeOrganizationId: u.activeOrganizationId,
    }));
  },
});

// One-time cleanup — internal only
export const deduplicateUsers = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();
    const emailMap = new Map<string, typeof allUsers>();

    for (const user of allUsers) {
      const email = (user.email || "").trim().toLowerCase();
      if (!email) continue;
      const existing = emailMap.get(email) || [];
      existing.push(user);
      emailMap.set(email, existing);
    }

    let deleted = 0;
    for (const [email, users] of emailMap) {
      if (users.length <= 1) continue;

      const sorted = [...users].sort((a, b) => {
        if (a.authUserId && !b.authUserId) return -1;
        if (!a.authUserId && b.authUserId) return 1;
        if (a.activeOrganizationId && !b.activeOrganizationId) return -1;
        if (!a.activeOrganizationId && b.activeOrganizationId) return 1;
        return 0;
      });

      const keep = sorted[0];
      for (let i = 1; i < sorted.length; i++) {
        console.log(`Deleting duplicate user ${sorted[i]._id} for email ${email} (keeping ${keep._id})`);
        await ctx.db.delete(sorted[i]._id);
        deleted++;
      }
    }

    return { deleted };
  },
});
