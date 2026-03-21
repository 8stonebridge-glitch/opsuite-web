'use client';

import { PresenceDot } from './PresenceDot';

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return '1d';
  return `${days}d`;
}

interface Participant {
  membershipId: string;
  name: string;
  avatarUrl?: string;
}

interface ConversationItemProps {
  id: string;
  subject?: string;
  isGroup: boolean;
  lastMessageText?: string;
  lastMessageAt?: string;
  unreadCount: number;
  participants: Participant[];
  isActive: boolean;
  onPress: () => void;
}

export function ConversationItem({
  subject,
  isGroup,
  lastMessageText,
  lastMessageAt,
  unreadCount,
  participants,
  isActive,
  onPress,
}: ConversationItemProps) {
  const displayName =
    subject ||
    participants.map((p) => p.name.split(' ')[0]).join(', ') ||
    'Conversation';

  const initials = participants.length > 0
    ? participants[0].name.charAt(0).toUpperCase()
    : '?';

  return (
    <button
      onClick={onPress}
      className={`flex items-center gap-3 px-4 py-3 w-full text-left transition-colors ${
        isActive
          ? 'bg-surface-100 dark:bg-surface-800'
          : 'hover:bg-surface-50 dark:hover:bg-surface-800/50'
      }`}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        {participants[0]?.avatarUrl ? (
          <img
            src={participants[0].avatarUrl}
            alt=""
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center text-caption font-bold text-surface-600 dark:text-surface-300">
            {isGroup ? participants.length : initials}
          </div>
        )}
        {!isGroup && participants.length === 1 && (
          <div className="absolute -bottom-0.5 -right-0.5">
            <PresenceDot isOnline={false} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span
            className={`text-caption truncate ${
              unreadCount > 0
                ? 'font-bold text-surface-900 dark:text-surface-100'
                : 'font-medium text-surface-700 dark:text-surface-300'
            }`}
          >
            {displayName}
          </span>
          {lastMessageAt && (
            <span className="text-[11px] text-surface-400 dark:text-surface-500 shrink-0 ml-2" suppressHydrationWarning>
              {relativeTime(lastMessageAt)}
            </span>
          )}
        </div>
        {lastMessageText && (
          <p
            className={`text-[13px] truncate mt-0.5 ${
              unreadCount > 0
                ? 'text-surface-700 dark:text-surface-300 font-medium'
                : 'text-surface-500 dark:text-surface-400'
            }`}
          >
            {lastMessageText}
          </p>
        )}
      </div>

      {/* Unread badge */}
      {unreadCount > 0 && (
        <div className="bg-emerald-500 rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shrink-0">
          <span className="text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        </div>
      )}
    </button>
  );
}
