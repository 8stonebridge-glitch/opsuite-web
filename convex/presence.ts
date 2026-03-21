import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireActiveOrganizationMembership } from "./authHelpers";

export const setTyping = mutation({
  args: {
    conversationId: v.id("conversations"),
    isTyping: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { membership } = await requireActiveOrganizationMembership(ctx);

    const participation = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_membership_conversation", (q) =>
        q.eq("membershipId", membership._id).eq("conversationId", args.conversationId),
      )
      .first();

    if (!participation) return;

    await ctx.db.patch(participation._id, {
      isTyping: args.isTyping,
      lastSeenAt: new Date().toISOString(),
    });
  },
});

export const updateLastSeen = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const { membership } = await requireActiveOrganizationMembership(ctx);

    const participation = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_membership_conversation", (q) =>
        q.eq("membershipId", membership._id).eq("conversationId", args.conversationId),
      )
      .first();

    if (!participation) return;

    await ctx.db.patch(participation._id, {
      lastSeenAt: new Date().toISOString(),
    });
  },
});

export const getPresence = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const { membership } = await requireActiveOrganizationMembership(ctx);

    const participants = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_conversation_id", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    const now = Date.now();
    const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes
    // isTyping has no server-side TTL. If a client disconnects without clearing it,
    // the flag stays true indefinitely. Guard against stale typing: treat as false
    // if lastSeenAt is older than this window — the client is no longer active.
    const TYPING_STALE_MS = 8 * 1000; // 8 seconds

    const presenceList = await Promise.all(
      participants
        .filter((p) => p.membershipId !== membership._id)
        .map(async (p) => {
          const m = await ctx.db.get(p.membershipId);
          if (!m) return null;
          const u = await ctx.db.get(m.userId);
          const lastSeen = p.lastSeenAt ? new Date(p.lastSeenAt).getTime() : 0;
          const typingIsStale = now - lastSeen > TYPING_STALE_MS;

          return {
            membershipId: p.membershipId,
            name: u?.name ?? "Unknown",
            isTyping: p.isTyping && !typingIsStale,
            isOnline: now - lastSeen < ONLINE_THRESHOLD_MS,
            lastSeenAt: p.lastSeenAt,
          };
        }),
    );

    return presenceList.filter(Boolean);
  },
});
