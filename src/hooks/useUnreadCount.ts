'use client';

import { useConversations } from './useConversations';

export function useUnreadCount() {
  const { conversations } = useConversations();
  const totalUnread = conversations.reduce(
    (sum, c) => sum + (c?.unreadCount ?? 0),
    0,
  );
  return totalUnread;
}
