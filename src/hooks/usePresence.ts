'use client';

import { useQuery, useMutation } from 'convex/react';
import { useCallback, useEffect, useRef } from 'react';
import { api } from '@/lib/convexApi';
import type { Id } from '@/lib/convexApiTypes';

export function usePresence(conversationId: Id<'conversations'>) {
  const presence = useQuery(api.presence.getPresence, { conversationId });
  const setTypingMutation = useMutation(api.presence.setTyping);
  const updateLastSeenMutation = useMutation(api.presence.updateLastSeen);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const isOnline = () => typeof navigator === 'undefined' || navigator.onLine;

  // Heartbeat: update lastSeen every 30s — skip when offline
  useEffect(() => {
    if (isOnline()) updateLastSeenMutation({ conversationId });
    const interval = setInterval(() => {
      if (isOnline()) updateLastSeenMutation({ conversationId });
    }, 30_000);
    return () => clearInterval(interval);
  }, [conversationId, updateLastSeenMutation]);

  const startTyping = useCallback(() => {
    if (!isOnline()) return;
    setTypingMutation({ conversationId, isTyping: true });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      setTypingMutation({ conversationId, isTyping: false });
    }, 3000);
  }, [conversationId, setTypingMutation]);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (!isOnline()) return;
    setTypingMutation({ conversationId, isTyping: false });
  }, [conversationId, setTypingMutation]);

  const typingUsers = (presence ?? []).filter((p) => p.isTyping);
  const onlineUsers = (presence ?? []).filter((p) => p.isOnline);

  return {
    presence: presence ?? [],
    typingUsers,
    onlineUsers,
    startTyping,
    stopTyping,
  };
}
