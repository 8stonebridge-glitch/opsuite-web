'use client';

import { useQuery, useMutation } from 'convex/react';
import { useCallback, useMemo, useState, useRef } from 'react';
import { api } from '@/lib/convexApi';
import type { Id } from '@/lib/convexApiTypes';

const MAX_MESSAGE_LENGTH = 2000;

interface FailedMessage {
  clientId: string;
  body: string;
  createdAt: string;
  status: 'sending' | 'failed';
}

export function useMessages(conversationId: Id<'conversations'>) {
  const [before, setBefore] = useState<string | undefined>(undefined);
  // INV-MSG-004: Track optimistic/failed messages so they appear in the UI
  const [pendingMessages, setPendingMessages] = useState<FailedMessage[]>([]);

  const result = useQuery(api.messages.list, { conversationId, before });
  const sendMutation = useMutation(api.messages.send);
  const markAsReadMutation = useMutation(api.messages.markAsRead);
  const markAsReadThrottleRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const loadMore = useCallback(() => {
    if (result?.cursor) {
      setBefore(result.cursor);
    }
  }, [result]);

  const send = useCallback(
    async (body: string) => {
      // INV-MSG-004: Guard against offline sends
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return; // ComposeInput should already be disabled, this is a safety net
      }

      const trimmed = body.trim().slice(0, MAX_MESSAGE_LENGTH);
      if (!trimmed) return;
      const clientId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const now = new Date().toISOString();

      // Add optimistic message to pending list
      setPendingMessages((prev) => [
        ...prev,
        { clientId, body: trimmed, createdAt: now, status: 'sending' },
      ]);

      try {
        await sendMutation({ conversationId, body: trimmed, clientId });
        // Remove from pending on success (server message will appear via subscription)
        setPendingMessages((prev) => prev.filter((m) => m.clientId !== clientId));
      } catch {
        // INV-MSG-004: Mark as failed, never leave in "sending" state
        setPendingMessages((prev) =>
          prev.map((m) => (m.clientId === clientId ? { ...m, status: 'failed' as const } : m)),
        );
      }
    },
    [conversationId, sendMutation],
  );

  const retrySend = useCallback(
    async (clientId: string) => {
      // INV-MSG-004: Guard against offline retries
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return;
      }

      const pending = pendingMessages.find((m) => m.clientId === clientId);
      if (!pending) return;

      // Mark as sending again
      setPendingMessages((prev) =>
        prev.map((m) => (m.clientId === clientId ? { ...m, status: 'sending' as const } : m)),
      );

      try {
        await sendMutation({ conversationId, body: pending.body, clientId });
        setPendingMessages((prev) => prev.filter((m) => m.clientId !== clientId));
      } catch {
        // Still failed
        setPendingMessages((prev) =>
          prev.map((m) => (m.clientId === clientId ? { ...m, status: 'failed' as const } : m)),
        );
      }
    },
    [conversationId, sendMutation, pendingMessages],
  );

  // Throttled markAsRead to avoid excessive calls on pagination — skip when offline
  const markAsRead = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    if (markAsReadThrottleRef.current) return;
    markAsReadThrottleRef.current = setTimeout(() => {
      markAsReadThrottleRef.current = undefined;
    }, 1000);
    await markAsReadMutation({ conversationId });
  }, [conversationId, markAsReadMutation]);

  // INV-MSG-002: Merge server messages with pending, sort by (createdAt, _id/clientId)
  const mergedMessages = useMemo(() => {
    const serverMessages = result?.messages ?? [];

    // Filter out pending messages that already appeared from server (by clientId match)
    const serverClientIds = new Set(serverMessages.map((m) => m.clientId));
    const activePending = pendingMessages.filter((m) => !serverClientIds.has(m.clientId));

    // Convert pending to the shape expected by the UI
    const pendingAsMessages = activePending.map((m) => ({
      _id: undefined as unknown as string,
      conversationId,
      organizationId: '' as string,
      senderMembershipId: '' as Id<'memberships'>,
      body: m.body,
      status: m.status,
      clientId: m.clientId,
      createdAt: m.createdAt,
      updatedAt: m.createdAt,
      senderName: 'You',
      senderAvatarUrl: undefined,
      isCurrentUser: true,
    }));

    const all = [...serverMessages, ...pendingAsMessages];

    // INV-MSG-002: deterministic sort by (createdAt, _id or clientId)
    all.sort((a, b) => {
      const timeCompare = a.createdAt.localeCompare(b.createdAt);
      if (timeCompare !== 0) return timeCompare;
      const aKey = a._id ?? a.clientId;
      const bKey = b._id ?? b.clientId;
      return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
    });

    return all;
  }, [result?.messages, pendingMessages, conversationId]);

  // Reset pending messages when conversation changes
  // Uses conditional setState during render (React-recommended pattern for prop-driven resets)
  const [prevConversationId, setPrevConversationId] = useState(conversationId);
  if (prevConversationId !== conversationId) {
    setPrevConversationId(conversationId);
    setPendingMessages([]);
    setBefore(undefined);
  }

  return {
    messages: mergedMessages,
    hasMore: result?.hasMore ?? false,
    isLoading: result === undefined,
    loadMore,
    send,
    retrySend,
    markAsRead,
  };
}
