import { v } from "convex/values";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { displayNameFromIdentity, requireCurrentUser } from "./authHelpers";
import {
  syncFromAuthArgs,
  syncFromAuthHandler,
} from "./userHelpers";

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_auth_user_id", (q) => q.eq("authUserId", identity.subject))
      .first();

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

// Action wrapper: fetches email/name from Clerk API if JWT doesn't include them,
// then calls the syncFromAuth mutation with the resolved values.
export const syncFromAuthAction: ReturnType<typeof action> = action({
  args: {},
  handler: async (ctx): Promise<unknown> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const jwtEmail =
      (typeof identity.email === "string" ? identity.email.trim().toLowerCase() : "") ||
      (typeof (identity as any).emailAddress === "string" ? (identity as any).emailAddress.trim().toLowerCase() : "");

    let email = jwtEmail;
    let name = "";
    let phone: string | undefined;
    let avatarUrl: string | undefined;

    if (jwtEmail) {
      name = displayNameFromIdentity(identity as unknown as Record<string, unknown>);
      avatarUrl = typeof identity.pictureUrl === "string" ? identity.pictureUrl : undefined;
      phone = resolvePhone(identity);
    } else {
      const result = await fetchClerkUser(identity.subject);
      email = result.email;
      name = result.name;
      phone = result.phone;
      avatarUrl = result.avatarUrl;
    }

    return await ctx.runMutation(internal.users.syncFromAuthInternal, {
      clerkEmail: email,
      clerkName: name,
      clerkPhone: phone,
      clerkAvatarUrl: avatarUrl,
    });
  },
});

function resolvePhone(identity: Record<string, unknown>): string | undefined {
  if (typeof (identity as any).phoneNumber === "string") {
    return (identity as any).phoneNumber.trim();
  }
  if (typeof (identity as any).phone_number === "string") {
    return (identity as any).phone_number.trim();
  }
  return undefined;
}

async function fetchClerkUser(subject: string) {
  const clerkSecret = process.env.CLERK_SECRET_KEY;
  if (!clerkSecret) {
    throw new Error("CLERK_SECRET_KEY not set and JWT is missing email claim");
  }

  const res = await fetch(`https://api.clerk.com/v1/users/${subject}`, {
    headers: { Authorization: `Bearer ${clerkSecret}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch user from Clerk: ${res.status}`);
  }

  const clerkUser = await res.json() as {
    email_addresses?: { email_address: string }[];
    phone_numbers?: { phone_number: string }[];
    first_name?: string;
    last_name?: string;
    image_url?: string;
  };

  const primaryEmail = clerkUser.email_addresses?.[0]?.email_address;
  if (!primaryEmail) {
    throw new Error("Clerk user has no email address");
  }

  return {
    email: primaryEmail.trim().toLowerCase(),
    name: [clerkUser.first_name, clerkUser.last_name].filter(Boolean).join(" ") || primaryEmail.trim().toLowerCase(),
    phone: clerkUser.phone_numbers?.[0]?.phone_number?.trim() || undefined,
    avatarUrl: clerkUser.image_url,
  };
}

// Internal mutation called by syncFromAuthAction (avoids circular type ref)
export const syncFromAuthInternal = internalMutation({
  args: syncFromAuthArgs,
  handler: syncFromAuthHandler,
});

// Public mutation (can be called directly if JWT has email claim)
export const syncFromAuth = mutation({
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

// One-time cleanup — internal only, not callable from client browsers
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
