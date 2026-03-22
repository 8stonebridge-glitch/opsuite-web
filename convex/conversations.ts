import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireActiveOrganizationMembership } from "./authHelpers";

export const list = query({
  args: {},
  handler: async (ctx) => {
    // Guard: return empty if user is not authenticated yet
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Guard: return empty if user has no active org
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

    // Get conversation participations for this user — capped at 100 to avoid
    // unbounded reads as the user's conversation count grows over time.
    const participations = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_organization_membership", (q) =>
        q.eq("organizationId", organizationId).eq("membershipId", membership._id),
      )
      .take(100);

    // Load conversations and enrich with participant info
    const conversations = await Promise.all(
      participations.map(async (p) => {
        const conversation = await ctx.db.get(p.conversationId);
        if (!conversation) return null;

        // Load participant memberships for display names
        const allParticipants = await ctx.db
          .query("conversationParticipants")
          .withIndex("by_conversation_id", (q) => q.eq("conversationId", conversation._id))
          .collect();

        const participantDetails = await Promise.all(
          allParticipants
            .filter((ap) => ap.membershipId !== membership._id)
            .map(async (ap) => {
              const m = await ctx.db.get(ap.membershipId);
              if (!m) return null;
              const u = await ctx.db.get(m.userId);
              return u ? { membershipId: m._id, name: u.name, avatarUrl: u.avatarUrl } : null;
            }),
        );

        return {
          _id: conversation._id,
          subject: conversation.subject,
          isGroup: conversation.isGroup,
          lastMessageText: conversation.lastMessageText,
          lastMessageAt: conversation.lastMessageAt,
          unreadCount: p.unreadCount,
          participants: participantDetails.filter(Boolean),
          updatedAt: conversation.updatedAt,
        };
      }),
    );

    return conversations
      .filter(Boolean)
      .sort((a, b) => {
        const aTime = a!.lastMessageAt || a!.updatedAt;
        const bTime = b!.lastMessageAt || b!.updatedAt;
        return bTime.localeCompare(aTime);
      });
  },
});

export const get = query({
  args: { conversationId: v.id("conversations") },
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
      throw new Error("You are not a participant in this conversation");
    }

    // Load all participants
    const allParticipants = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_conversation_id", (q) => q.eq("conversationId", conversation._id))
      .collect();

    const participantDetails = await Promise.all(
      allParticipants.map(async (ap) => {
        const m = await ctx.db.get(ap.membershipId);
        if (!m) return null;
        const u = await ctx.db.get(m.userId);
        return u
          ? {
              membershipId: m._id,
              name: u.name,
              avatarUrl: u.avatarUrl,
              isTyping: ap.isTyping,
              lastSeenAt: ap.lastSeenAt,
              isCurrentUser: m._id === membership._id,
            }
          : null;
      }),
    );

    return {
      ...conversation,
      participants: participantDetails.filter(Boolean),
      currentUserUnreadCount: participation.unreadCount,
    };
  },
});

export const create = mutation({
  args: {
    participantMembershipIds: v.array(v.id("memberships")),
    subject: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId, membership } = await requireActiveOrganizationMembership(ctx);
    const now = new Date().toISOString();

    // Include current user in participants
    const allParticipantIds = Array.from(
      new Set([membership._id, ...args.participantMembershipIds]),
    );

    // Verify all participants belong to the same org
    for (const mId of allParticipantIds) {
      const m = await ctx.db.get(mId);
      if (!m || m.organizationId !== organizationId || m.status !== "active") {
        throw new Error(`Invalid participant: ${mId}`);
      }
    }

    // For 1:1, check if conversation already exists
    if (allParticipantIds.length === 2 && !args.subject) {
      const myParticipations = await ctx.db
        .query("conversationParticipants")
        .withIndex("by_organization_membership", (q) =>
          q.eq("organizationId", organizationId).eq("membershipId", membership._id),
        )
        .collect();

      for (const p of myParticipations) {
        const conv = await ctx.db.get(p.conversationId);
        if (conv && !conv.isGroup && conv.participantIds.length === 2) {
          const otherMemberId = allParticipantIds.find((id) => id !== membership._id);
          if (conv.participantIds.includes(otherMemberId!)) {
            return conv._id;
          }
        }
      }
    }

    const conversationId = await ctx.db.insert("conversations", {
      organizationId,
      participantIds: allParticipantIds,
      isGroup: allParticipantIds.length > 2 || !!args.subject,
      subject: args.subject,
      createdAt: now,
      updatedAt: now,
    });

    // Create participant records
    for (const mId of allParticipantIds) {
      await ctx.db.insert("conversationParticipants", {
        conversationId,
        membershipId: mId,
        organizationId,
        unreadCount: 0,
        isTyping: false,
        joinedAt: now,
      });
    }

    return conversationId;
  },
});
