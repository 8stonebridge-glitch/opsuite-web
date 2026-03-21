'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/lib/convexApi';
import { ConversationList } from '@/components/messaging/ConversationList';
import { ThreadView } from '@/components/messaging/ThreadView';
import { MessageSquarePlus, ArrowLeft } from 'lucide-react';
import type { Id } from '@/lib/convexApiTypes';

export default function MessagesPage() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const members = useQuery(api.memberships.listForActiveOrganization);
  const createConversation = useMutation(api.conversations.create);

  const handleNewConversation = async (membershipId: string) => {
    const conversationId = await createConversation({
      participantMembershipIds: [membershipId as Id<'memberships'>],
    });
    setSelectedId(conversationId as string);
    setShowNewConversation(false);
  };

  return (
    <div className="flex h-[calc(100vh-56px)] md:h-screen bg-white dark:bg-surface-950">
      {/* Sidebar: Conversation List */}
      <div
        className={`w-full md:w-80 lg:w-96 border-r border-surface-100 dark:border-surface-800 flex flex-col ${
          selectedId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 dark:border-surface-800">
          <h1 className="text-heading text-surface-900 dark:text-surface-100 font-bold">
            Messages
          </h1>
          <button
            onClick={() => setShowNewConversation(!showNewConversation)}
            className="w-9 h-9 rounded-xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
            aria-label="New conversation"
          >
            <MessageSquarePlus className="h-4.5 w-4.5 text-surface-600 dark:text-surface-400" />
          </button>
        </div>

        {/* New conversation member picker */}
        {showNewConversation && members && (
          <div className="border-b border-surface-100 dark:border-surface-800 max-h-60 overflow-y-auto">
            <div className="px-4 py-2 text-[11px] font-medium text-surface-400 dark:text-surface-500 uppercase tracking-wider">
              Start a conversation with
            </div>
            {(members as Array<{ membership: { _id: string; role: string }; user: { _id: string; name: string; email?: string } } | null>)
              ?.filter(Boolean)
              .map((entry) => (
                <button
                  key={entry!.membership._id}
                  onClick={() => handleNewConversation(entry!.membership._id)}
                  className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-surface-50 dark:hover:bg-surface-800/50 text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center text-[12px] font-bold text-surface-600 dark:text-surface-300">
                    {entry!.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-caption text-surface-900 dark:text-surface-100 block truncate">
                      {entry!.user.name}
                    </span>
                    <span className="text-[12px] text-surface-400 dark:text-surface-500 block truncate">
                      {entry!.membership.role}
                    </span>
                  </div>
                </button>
              ))}
          </div>
        )}

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          <ConversationList
            activeConversationId={selectedId ?? undefined}
            onSelect={setSelectedId}
          />
        </div>
      </div>

      {/* Main: Thread View */}
      <div
        className={`flex-1 flex flex-col ${
          selectedId ? 'flex' : 'hidden md:flex'
        }`}
      >
        {selectedId ? (
          <>
            {/* Mobile back button */}
            <div className="md:hidden flex items-center gap-2 px-4 py-3 border-b border-surface-100 dark:border-surface-800">
              <button
                onClick={() => setSelectedId(null)}
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                aria-label="Back to conversations"
              >
                <ArrowLeft className="h-5 w-5 text-surface-600 dark:text-surface-400" />
              </button>
              <span className="text-caption font-medium text-surface-900 dark:text-surface-100">
                Back
              </span>
            </div>
            <ThreadView conversationId={selectedId as Id<'conversations'>} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquarePlus className="h-12 w-12 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
              <p className="text-caption text-surface-500 dark:text-surface-400">
                Select a conversation or start a new one
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
