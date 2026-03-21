'use client';

import { useQuery } from 'convex/react';
import { api } from '@/lib/convexApi';

export function useConversations() {
  const conversations = useQuery(api.conversations.list);
  return {
    conversations: conversations ?? [],
    isLoading: conversations === undefined,
  };
}
