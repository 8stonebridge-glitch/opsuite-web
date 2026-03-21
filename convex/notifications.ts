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
    const { membership } = await requireActiveOrganizationMembership(ctx);
    const cap = Math.min(args.limit ?? 50, 100);

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_membership_id", (q) => q.eq("membershipId", membership._id))
      .order("desc")
      .take(cap);

    return notifications
      .filter((n) => !n.isDismissed)
      .map((n) => ({
        id: n._id as string,
        title: n.title,
        body: n.body,
        timestamp: n.createdAt,
        type: n.type,
        taskId: n.taskId ? (n.taskId as string) : undefined,
        route: n.route,
        isRead: n.isRead,
      }));
  },
});

export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const { membership } = await requireActiveOrganizationMembership(ctx);

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
  },
) {
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

  return await ctx.db.insert("notifications", {
    organizationId: params.organizationId,
    membershipId: params.membershipId,
    title: params.title,
    body: params.body,
    type: params.type,
    taskId: params.taskId,
    route: params.route,
    isRead: false,
    isDismissed: false,
    createdAt: new Date().toISOString(),
  });
}
