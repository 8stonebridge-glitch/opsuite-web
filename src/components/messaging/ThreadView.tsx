'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useMessages } from '@/hooks/useMessages';
import { usePresence } from '@/hooks/usePresence';
import { MessageBubble } from './MessageBubble';
import { ComposeInput } from './ComposeInput';
import { TypingIndicator } from './TypingIndicator';
import { MessageSkeleton } from './MessageSkeleton';
import { OfflineBanner } from './OfflineBanner';
import { ArrowUp } from 'lucide-react';
import type { Id } from '@/lib/convexApiTypes';

interface ThreadViewProps {
  conversationId: Id<'conversations'>;
}

function useIsOffline() {
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );
  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);
  return offline;
}

export function ThreadView({ conversationId }: ThreadViewProps) {
  const { messages, hasMore, isLoading, loadMore, send, retrySend, markAsRead } =
    useMessages(conversationId);
  const { typingUsers, startTyping, stopTyping } = usePresence(conversationId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const prevMessageCountRef = useRef(0);
  const isInitialLoadRef = useRef(true);
  const isOffline = useIsOffline();

  // Track whether user is at the bottom of the scroll area
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 60;
    isAtBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);

  // Scroll to bottom on initial load or when new messages arrive and user is at bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (isInitialLoadRef.current && messages.length > 0) {
      el.scrollTop = el.scrollHeight;
      isInitialLoadRef.current = false;
      prevMessageCountRef.current = messages.length;
      return;
    }

    const isNewMessage = messages.length > prevMessageCountRef.current;
    if (isNewMessage && isAtBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length]);

  // Reset on conversation change
  useEffect(() => {
    isInitialLoadRef.current = true;
    isAtBottomRef.current = true;
    prevMessageCountRef.current = 0;
  }, [conversationId]);

  // Mark as read when viewing
  useEffect(() => {
    markAsRead();
  }, [markAsRead, messages.length]);

  const handleSend = async (body: string) => {
    stopTyping();
    await send(body);
  };

  const handleRetry = (clientId: string) => {
    retrySend(clientId);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full" role="status" aria-label="Loading messages">
        <MessageSkeleton />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" role="log" aria-label="Message thread">
      <OfflineBanner isOffline={isOffline} />

      {/* Messages area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-2"
        aria-label="Messages"
      >
        {/* Load more */}
        {hasMore && (
          <div className="flex justify-center pb-2">
            <button
              onClick={loadMore}
              aria-label="Load older messages"
              className="flex items-center gap-1 px-3 py-1.5 text-[12px] text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-full transition-colors"
            >
              <ArrowUp className="h-3.5 w-3.5" />
              Load older messages
            </button>
          </div>
        )}

        {/* Message list */}
        {messages.map((msg, idx) => {
          const prev = idx > 0 ? messages[idx - 1] : null;
          const showSender =
            !prev || prev.senderMembershipId !== msg.senderMembershipId;

          return (
            <MessageBubble
              key={msg._id ?? msg.clientId}
              body={msg.body}
              senderName={msg.senderName}
              senderAvatarUrl={msg.senderAvatarUrl}
              isCurrentUser={msg.isCurrentUser}
              status={msg.status as 'sending' | 'sent' | 'delivered' | 'failed'}
              createdAt={msg.createdAt}
              showSender={showSender}
              onRetry={
                msg.status === 'failed' && msg.clientId
                  ? () => handleRetry(msg.clientId)
                  : undefined
              }
            />
          );
        })}

        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-[14px] text-surface-400 dark:text-surface-500">
            No messages yet. Start the conversation!
          </div>
        )}
      </div>

      {/* Typing indicator */}
      <div aria-live="polite" aria-atomic="true">
        <TypingIndicator names={typingUsers.map((u) => u.name)} />
      </div>

      {/* Compose */}
      <ComposeInput onSend={handleSend} onTyping={startTyping} disabled={isOffline} />
    </div>
  );
}
