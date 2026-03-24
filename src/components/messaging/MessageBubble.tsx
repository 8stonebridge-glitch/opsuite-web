import Image from 'next/image';

interface MessageBubbleProps {
  body: string;
  senderName: string;
  senderAvatarUrl?: string;
  isCurrentUser: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'failed';
  createdAt: string;
  showSender: boolean;
  onRetry?: () => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function MessageBubble({
  body,
  senderName,
  senderAvatarUrl,
  isCurrentUser,
  status,
  createdAt,
  showSender,
  onRetry,
}: MessageBubbleProps) {
  return (
    <div
      className={`flex items-end gap-2 max-w-[80%] ${
        isCurrentUser ? 'ml-auto flex-row-reverse' : ''
      }`}
    >
      {/* Avatar (only for others, only when showing sender) */}
      {!isCurrentUser && showSender ? (
        senderAvatarUrl ? (
          <Image
            src={senderAvatarUrl}
            alt=""
            width={28}
            height={28}
            unoptimized
            className="w-7 h-7 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center text-[11px] font-bold text-surface-600 dark:text-surface-300 shrink-0">
            {senderName.charAt(0).toUpperCase()}
          </div>
        )
      ) : !isCurrentUser ? (
        <div className="w-7 shrink-0" /> // spacer for alignment
      ) : null}

      <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
        {/* Sender name */}
        {showSender && !isCurrentUser && (
          <span className="text-[11px] font-medium text-surface-500 dark:text-surface-400 mb-0.5 px-1">
            {senderName}
          </span>
        )}

        {/* Bubble */}
        <div
          className={`px-3.5 py-2 text-[14px] leading-relaxed ${
            isCurrentUser
              ? 'bg-emerald-600 text-white rounded-2xl rounded-br-md'
              : 'bg-surface-100 dark:bg-surface-800 text-surface-900 dark:text-surface-100 rounded-2xl rounded-bl-md'
          }`}
        >
          {body}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-1 mt-0.5 px-1">
          <span className="text-[10px] text-surface-400 dark:text-surface-500" suppressHydrationWarning>
            {formatTime(createdAt)}
          </span>
          {isCurrentUser && (
            <span className="text-[10px] text-surface-400 dark:text-surface-500" aria-label={`Message ${status}`}>
              {status === 'sending' ? '⏳' : status === 'failed' ? '❌' : '✓'}
            </span>
          )}
          {status === 'failed' && onRetry && (
            <button
              onClick={onRetry}
              className="text-[10px] text-red-500 hover:text-red-400 font-medium underline"
              aria-label="Retry sending message"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
