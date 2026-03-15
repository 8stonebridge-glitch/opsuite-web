'use client';

import { useInbox } from './InboxProvider';
import { useTheme } from '../../providers/ThemeProvider';

export function InboxButton() {
  const { unreadCount, openInbox } = useInbox();
  const { isDark } = useTheme();

  return (
    <button onClick={openInbox} className="relative p-1">
      <span style={{ color: isDark ? '#d1d5db' : '#374151', fontSize: 22 }}>&#x1F514;</span>
      {unreadCount > 0 && (
        <div className="absolute -top-0.5 -right-0.5 bg-red-500 rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
          <span className="text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        </div>
      )}
    </button>
  );
}
