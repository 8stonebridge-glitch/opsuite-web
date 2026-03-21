import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireActiveOrganizationMembership } from "./authHelpers";

export const list = query({
  args: {
    conversationId: v.id("conversations"),
    limit: v.optional(v.number()),
    before: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId, membership } = await requireActiveOrganizationMembership(ctx);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.organizationId !== organizationId) {
      throw new Error("Conversation not found");
    }

    // Verify participation
    const participation = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_membership_conversation", (q) =>
        q.eq("membershipId", membership._id).eq("conversationId", args.conversationId),
      )
      .first();

    if (!participation) {
      throw new Error("Not a participant");
    }

    const limit = args.limit ?? 50;

    // Query messages ordered by creation time
    let messagesQuery = ctx.db
      .query("messages")
      .withIndex("by_conversation_created_at", (q) => {
        const base = q.eq("conversationId", args.conversationId);
        if (args.before) {
          return base.lt("createdAt", args.before);
        }
        return base;
      })
      .order("desc")
      .take(limit + 1);

    const messages = await messagesQuery;
    const hasMore = messages.length > limit;
    const page = hasMore ? messages.slice(0, limit) : messages;

    // INV-MSG-002: deterministic ordering by (createdAt, _id) composite key
    // Convex _id is monotonically increasing, so it breaks ties for same-timestamp messages
    page.sort((a, b) => {
      const timeCompare = a.createdAt.localeCompare(b.createdAt);
      if (timeCompare !== 0) return timeCompare;
      // _id as tiebreaker for deterministic ordering
      return a._id < b._id ? -1 : a._id > b._id ? 1 : 0;
    });

    // Enrich with sender info
    const enriched = await Promise.all(
      page.map(async (msg) => {
        const senderMembership = await ctx.db.get(msg.senderMembershipId);
        let senderName = "Unknown";
        let senderAvatarUrl: string | undefined;

        if (senderMembership) {
          const user = await ctx.db.get(senderMembership.userId);
          if (user) {
            senderName = user.name;
            senderAvatarUrl = user.avatarUrl ?? undefined;
          }
        }

        return {
          ...msg,
          senderName,
          senderAvatarUrl,
          isCurrentUser: msg.senderMembershipId === membership._id,
        };
      }),
    );

    return {
      messages: enriched, // already in chronological order via INV-MSG-002 sort
      hasMore,
      cursor: hasMore ? page[page.length - 1].createdAt : undefined,
    };
  },
});

export const send = mutation({
  args: {
    conversationId: v.id("conversations"),
    body: v.string(),
    clientId: v.string(),
    replyToMessageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const { organizationId, membership } = await requireActiveOrganizationMembership(ctx);
    const now = new Date().toISOString();

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.organizationId !== organizationId) {
      throw new Error("Conversation not found");
    }

    // Verify participation
    const participation = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_membership_conversation", (q) =>
        q.eq("membershipId", membership._id).eq("conversationId", args.conversationId),
      )
      .first();

    if (!participation) {
      throw new Error("Not a participant");
    }

    // INV-MSG-003: Validate replyToMessageId belongs to same conversation & org
    if (args.replyToMessageId) {
      const replyMsg = await ctx.db.get(args.replyToMessageId);
      if (
        !replyMsg ||
        replyMsg.conversationId !== args.conversationId ||
        replyMsg.organizationId !== organizationId
      ) {
        throw new Error("Invalid reply target");
      }
    }

    // Deduplicate by clientId
    const existing = await ctx.db
      .query("messages")
      .withIndex("by_client_id", (q) => q.eq("clientId", args.clientId))
      .first();

    if (existing) {
      return existing._id;
    }

    // Validate message body length
    const trimmedBody = args.body.trim();
    if (!trimmedBody || trimmedBody.length > 2000) {
      throw new Error("Message body must be between 1 and 2000 characters");
    }

    // Create the message
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      organizationId,
      senderMembershipId: membership._id,
      body: args.body.trim(),
      status: "sent",
      clientId: args.clientId,
      replyToMessageId: args.replyToMessageId,
      createdAt: now,
      updatedAt: now,
    });

    // Update conversation with last message
    await ctx.db.patch(args.conversationId, {
      lastMessageText: args.body.trim().slice(0, 200),
      lastMessageAt: now,
      lastMessageByMembershipId: membership._id,
      updatedAt: now,
    });

    // INV-MSG-001: Atomic unread count increment
    // Re-read each participant record immediately before patching to avoid
    // stale reads under concurrent sends to the same conversation
    const allParticipants = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_conversation_id", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    for (const p of allParticipants) {
      if (p.membershipId !== membership._id) {
        // Re-fetch the latest state to prevent race condition on concurrent sends
        const fresh = await ctx.db.get(p._id);
        if (fresh) {
          await ctx.db.patch(p._id, {
            unreadCount: fresh.unreadCount + 1,
          });
        }
      }
    }

    return messageId;
  },
});

export const markAsRead = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const { membership } = await requireActiveOrganizationMembership(ctx);
    const now = new Date().toISOString();

    const participation = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_membership_conversation", (q) =>
        q.eq("membershipId", membership._id).eq("conversationId", args.conversationId),
      )
      .first();

    if (!participation) {
      throw new Error("Not a participant");
    }

    await ctx.db.patch(participation._id, {
      lastReadAt: now,
      unreadCount: 0,
    });
  },
});
