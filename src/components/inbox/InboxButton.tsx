'use client';

import { useInbox } from './InboxProvider';
import { Bell } from 'lucide-react';

export function InboxButton() {
  const { unreadCount, openInbox } = useInbox();

  return (
    <button onClick={openInbox} className="relative p-1 w-10 h-10 flex items-center justify-center">
      <Bell className="h-[22px] w-[22px] text-surface-700 dark:text-surface-300" />
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
