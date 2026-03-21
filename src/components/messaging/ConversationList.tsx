'use client';

import { useConversations } from '@/hooks/useConversations';
import { ConversationItem } from './ConversationItem';
import { ConversationSkeleton } from './ConversationSkeleton';
import { MessageSquare } from 'lucide-react';

interface ConversationListProps {
  activeConversationId?: string;
  onSelect: (conversationId: string) => void;
}

export function ConversationList({ activeConversationId, onSelect }: ConversationListProps) {
  const { conversations, isLoading } = useConversations();

  if (isLoading) {
    return <ConversationSkeleton />;
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-4">
          <MessageSquare className="h-7 w-7 text-surface-400 dark:text-surface-500" />
        </div>
        <p className="text-caption font-medium text-surface-600 dark:text-surface-400">
          No conversations yet
        </p>
        <p className="text-[13px] text-surface-400 dark:text-surface-500 mt-1">
          Start a new conversation with your team
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-surface-100 dark:divide-surface-800">
      {conversations.map((conv) =>
        conv ? (
          <ConversationItem
            key={conv._id}
            id={conv._id}
            subject={conv.subject}
            isGroup={conv.isGroup}
            lastMessageText={conv.lastMessageText}
            lastMessageAt={conv.lastMessageAt}
            unreadCount={conv.unreadCount}
            participants={conv.participants as { membershipId: string; name: string; avatarUrl?: string }[]}
            isActive={conv._id === activeConversationId}
            onPress={() => onSelect(conv._id)}
          />
        ) : null,
      )}
    </div>
  );
}
