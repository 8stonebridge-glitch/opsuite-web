import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { requireActiveOrganizationMembership } from "./authHelpers";

// ── Notification type validator (matches schema) ──────────────────────

const notificationType = v.union(
  v.literal("task"),
  v.literal("availability"),
  v.literal("handoff"),
  v.literal("coverage"),
  v.literal("review"),
  v.literal("system"),
);

// ── Queries ───────────────────────────────────────────────────────────

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db.query("users").withIndex("by_auth_user_id", (q) => q.eq("authUserId", identity.subject)).first();
    if (!user) return [];
    const membership = await ctx.db.query("memberships").withIndex("by_user_id", (q) => q.eq("userId", user._id)).filter((q) => q.eq(q.field("status"), "active")).first();
    if (!membership) return [];
    const cap = Math.min(args.limit ?? 50, 100);

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_membership_id", (q) => q.eq("membershipId", membership._id))
      .order("desc")
      .take(cap);

    const now = new Date().toISOString();
    return notifications
      .filter((n) => !n.isDismissed)
      .filter((n) => !n.snoozeUntil || n.snoozeUntil <= now)
      .map((n) => ({
        id: n._id as string,
        title: n.title,
        body: n.body,
        timestamp: n.createdAt,
        type: n.type,
        taskId: n.taskId ? (n.taskId as string) : undefined,
        route: n.route,
        reason: n.reason,
        isRead: n.isRead,
      }));
  },
});

export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;
    const user = await ctx.db.query("users").withIndex("by_auth_user_id", (q) => q.eq("authUserId", identity.subject)).first();
    if (!user) return 0;
    const membership = await ctx.db.query("memberships").withIndex("by_user_id", (q) => q.eq("userId", user._id)).filter((q) => q.eq(q.field("status"), "active")).first();
    if (!membership) return 0;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_membership_read", (q) =>
        q.eq("membershipId", membership._id).eq("isRead", false),
      )
      .collect();

    return unread.filter((n) => !n.isDismissed).length;
  },
});

// ── Mutations ─────────────────────────────────────────────────────────

export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const { membership } = await requireActiveOrganizationMembership(ctx);
    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.membershipId !== membership._id) return;
    await ctx.db.patch(args.notificationId, { isRead: true });
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const { membership } = await requireActiveOrganizationMembership(ctx);

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_membership_read", (q) =>
        q.eq("membershipId", membership._id).eq("isRead", false),
      )
      .collect();

    await Promise.all(
      unread.map((n) => ctx.db.patch(n._id, { isRead: true })),
    );
  },
});

export const dismiss = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const { membership } = await requireActiveOrganizationMembership(ctx);
    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.membershipId !== membership._id) return;
    await ctx.db.patch(args.notificationId, { isDismissed: true });
  },
});

export const snooze = mutation({
  args: {
    notificationId: v.id("notifications"),
    duration: v.union(v.literal("1h"), v.literal("1d"), v.literal("1w")),
  },
  handler: async (ctx, args) => {
    const { membership } = await requireActiveOrganizationMembership(ctx);
    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.membershipId !== membership._id) return;

    const now = new Date();
    switch (args.duration) {
      case "1h":
        now.setHours(now.getHours() + 1);
        break;
      case "1d":
        now.setDate(now.getDate() + 1);
        break;
      case "1w":
        now.setDate(now.getDate() + 7);
        break;
    }
    await ctx.db.patch(args.notificationId, { snoozeUntil: now.toISOString() });
  },
});

// ── Notification Preferences ─────────────────────────────────────────

const NOTIFICATION_TYPES = ["task", "availability", "handoff", "coverage", "review", "system"] as const;
type NotificationType = typeof NOTIFICATION_TYPES[number];

const DEFAULT_PREFS: Record<NotificationType, boolean> = {
  task: true, availability: true, handoff: true,
  coverage: true, review: true, system: true,
};

export const getPreferences = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return DEFAULT_PREFS;
    const user = await ctx.db.query("users").withIndex("by_auth_user_id", (q) => q.eq("authUserId", identity.subject)).first();
    if (!user) return DEFAULT_PREFS;
    const membership = await ctx.db.query("memberships").withIndex("by_user_id", (q) => q.eq("userId", user._id)).filter((q) => q.eq(q.field("status"), "active")).first();
    if (!membership) return DEFAULT_PREFS;
    const prefs = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_membership_id", (q) => q.eq("membershipId", membership._id))
      .first();
    if (!prefs) return DEFAULT_PREFS;
    return {
      task: prefs.task, availability: prefs.availability,
      handoff: prefs.handoff, coverage: prefs.coverage,
      review: prefs.review, system: prefs.system,
    };
  },
});

export const updatePreferences = mutation({
  args: {
    task: v.boolean(),
    availability: v.boolean(),
    handoff: v.boolean(),
    coverage: v.boolean(),
    review: v.boolean(),
    system: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { membership } = await requireActiveOrganizationMembership(ctx);
    const existing = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_membership_id", (q) => q.eq("membershipId", membership._id))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("notificationPreferences", {
        membershipId: membership._id,
        ...args,
      });
    }
  },
});

// ── Internal helper — used by other mutations to emit notifications ──

export async function createNotification(
  ctx: MutationCtx,
  params: {
    organizationId: Id<"organizations">;
    membershipId: Id<"memberships">;
    title: string;
    body: string;
    type: "task" | "availability" | "handoff" | "coverage" | "review" | "system";
    taskId?: Id<"tasks">;
    route?: string;
    reason?: string;
  },
) {
  // Check user's notification preferences — skip if they've opted out of this type
  const prefs = await ctx.db
    .query("notificationPreferences")
    .withIndex("by_membership_id", (q) => q.eq("membershipId", params.membershipId))
    .first();
  if (prefs && !prefs[params.type]) return null;

  // Deduplication: don't create an identical notification within 60s
  const recent = await ctx.db
    .query("notifications")
    .withIndex("by_membership_id", (q) => q.eq("membershipId", params.membershipId))
    .order("desc")
    .take(5);

  const sixtySecondsAgo = new Date(Date.now() - 60_000).toISOString();
  const isDuplicate = recent.some(
    (n) =>
      n.title === params.title &&
      n.body === params.body &&
      n.type === params.type &&
      n.createdAt > sixtySecondsAgo,
  );

  if (isDuplicate) return null;

  try {
    return await ctx.db.insert("notifications", {
      organizationId: params.organizationId,
      membershipId: params.membershipId,
      title: params.title,
      body: params.body,
      type: params.type,
      taskId: params.taskId,
      route: params.route,
      reason: params.reason,
      isRead: false,
      isDismissed: false,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    const now = new Date().toISOString();
    await ctx.db.insert("notificationDeadLetters", {
      organizationId: params.organizationId,
      membershipId: params.membershipId,
      title: params.title,
      body: params.body,
      type: params.type,
      reason: params.reason,
      taskId: params.taskId,
      route: params.route,
      error: error instanceof Error ? error.message : String(error),
      attempts: 1,
      lastAttemptAt: now,
      createdAt: now,
    });
    return null;
  }
}
