'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { ThreadView } from '@/components/messaging/ThreadView';
import { ArrowLeft } from 'lucide-react';
import type { Id } from '@/lib/convexApiTypes';

export default function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = use(params);
  const router = useRouter();

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] md:h-screen bg-white dark:bg-surface-950">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-100 dark:border-surface-800">
        <button
          onClick={() => router.push('/admin/messages')}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          aria-label="Back to messages"
        >
          <ArrowLeft className="h-5 w-5 text-surface-600 dark:text-surface-400" />
        </button>
        <span className="text-caption font-medium text-surface-900 dark:text-surface-100">
          Conversation
        </span>
      </div>

      <ThreadView conversationId={conversationId as Id<'conversations'>} />
    </div>
  );
}
