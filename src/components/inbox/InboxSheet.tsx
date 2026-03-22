'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useInbox } from './InboxProvider';
import { useApp } from '../../store/AppContext';
import type { NotificationItem } from '../../lib/convexApiTypes';
import type { Role } from '../../types';
import { ClipboardList, Calendar, ArrowLeftRight, AlertCircle, CheckCircle, BellOff, X, MoreHorizontal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';

// ── Time formatting ──────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

// ── Date grouping ────────────────────────────────────────────────────

type DateGroup = 'Today' | 'This Week' | 'Earlier';

function getDateGroup(iso: string): DateGroup {
  const now = new Date();
  const then = new Date(iso);

  // Start of today (midnight)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (then >= startOfToday) return 'Today';

  // Start of this week (most recent Monday, or Sunday depending on locale — use Monday)
  const dayOfWeek = now.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday);
  if (then >= startOfWeek) return 'This Week';

  return 'Earlier';
}

function groupNotifications(
  notifications: NotificationItem[],
): { group: DateGroup; items: NotificationItem[] }[] {
  const groups: Record<DateGroup, NotificationItem[]> = {
    Today: [],
    'This Week': [],
    Earlier: [],
  };

  for (const n of notifications) {
    groups[getDateGroup(n.timestamp)].push(n);
  }

  const result: { group: DateGroup; items: NotificationItem[] }[] = [];
  const order: DateGroup[] = ['Today', 'This Week', 'Earlier'];
  for (const g of order) {
    if (groups[g].length > 0) {
      result.push({ group: g, items: groups[g] });
    }
  }
  return result;
}

// ── Icon for notification type ───────────────────────────────────────

const NOTIFICATION_ICONS: Record<string, LucideIcon> = {
  task: ClipboardList,
  availability: Calendar,
  handoff: ArrowLeftRight,
  coverage: AlertCircle,
  review: CheckCircle,
  system: BellOff,
};

function IconForType({ type }: { type: NotificationItem['type'] }) {
  const Icon = NOTIFICATION_ICONS[type] || ClipboardList;
  return <Icon className="h-4 w-4 text-surface-500 dark:text-surface-400" />;
}

// ── Triage overflow menu ─────────────────────────────────────────────

function TriageMenu({
  notificationId,
  onSnooze,
  onDismiss,
}: {
  notificationId: string;
  onSnooze: (id: string, duration: '1h' | '1d' | '1w') => void;
  onDismiss: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, close]);

  const menuItems: { label: string; action: () => void }[] = [
    { label: 'Snooze 1h', action: () => { onSnooze(notificationId, '1h'); close(); } },
    { label: 'Snooze 1d', action: () => { onSnooze(notificationId, '1d'); close(); } },
    { label: 'Snooze 1w', action: () => { onSnooze(notificationId, '1w'); close(); } },
    { label: 'Dismiss', action: () => { onDismiss(notificationId); close(); } },
  ];

  return (
    <div className="relative flex-shrink-0" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
        aria-label="Notification actions"
      >
        <MoreHorizontal className="h-4 w-4 text-surface-400 dark:text-surface-500" />
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-50 w-36 rounded-xl bg-white dark:bg-surface-900 shadow-lg border border-surface-100 dark:border-surface-800 py-1 overflow-hidden">
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={(e) => {
                e.stopPropagation();
                item.action();
              }}
              className="w-full text-left px-3 py-2 text-[13px] text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Single row ───────────────────────────────────────────────────────

function NotificationRow({
  notification,
  isUnread,
  onPress,
  onDismiss,
  onSnooze,
}: {
  notification: NotificationItem;
  isUnread: boolean;
  onPress: () => void;
  onDismiss: (id: string) => void;
  onSnooze: (id: string, duration: '1h' | '1d' | '1w') => void;
}) {
  return (
    <button
      onClick={onPress}
      className="group flex items-center px-5 py-3.5 hover:bg-surface-50 dark:hover:bg-surface-800 w-full text-left"
    >
      {/* Unread dot */}
      <div className="w-3 flex items-center mr-2">
        {isUnread && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
      </div>

      {/* Icon */}
      <div className="w-8 h-8 rounded-xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center mr-3 flex-shrink-0">
        <IconForType type={notification.type} />
      </div>

      {/* Content */}
      <div className="flex-1 mr-2 min-w-0">
        <span className="text-caption text-surface-900 dark:text-surface-100 block truncate">
          {notification.title}
        </span>
        <span className="text-[13px] text-surface-500 dark:text-surface-400 mt-0.5 block truncate">
          {notification.body}
        </span>
        {notification.reason && (
          <span className="text-[11px] text-surface-400 dark:text-surface-500 mt-0.5 block truncate italic">
            {notification.reason}
          </span>
        )}
        <span className="text-[11px] text-surface-400 dark:text-surface-500 mt-1 block" suppressHydrationWarning>
          {relativeTime(notification.timestamp)}
        </span>
      </div>

      {/* Triage menu */}
      <TriageMenu
        notificationId={notification.id}
        onSnooze={onSnooze}
        onDismiss={onDismiss}
      />
    </button>
  );
}

// ── Section header ───────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-5 pt-4 pb-1.5">
      <span className="text-[11px] uppercase tracking-wider text-surface-400">
        {label}
      </span>
    </div>
  );
}

// ── Sheet ────────────────────────────────────────────────────────────

export function InboxSheet() {
  const { notifications, isLoading, showInbox, closeInbox, markRead, dismiss, snooze, isRead } = useInbox();
  const { state } = useApp();
  const router = useRouter();
  const [unreadOnly, setUnreadOnly] = useState(false);

  const resolveNotificationPath = (notification: NotificationItem, role: Role) => {
    const rolePrefix = role === 'admin' ? 'admin' : role;

    if (notification.taskId) {
      return `/${rolePrefix}/tasks/${notification.taskId}`;
    }

    const explicitRoute = notification.route?.replace(/^\/+/, '');
    if (explicitRoute) {
      const routeMap: Record<Role, Record<string, string>> = {
        admin: {
          overview: '/admin/overview',
          tasks: '/admin/tasks',
          people: '/admin/people',
          sites: '/admin/sites',
          more: '/admin/more',
          availability: '/admin/overview',
          handoff: '/admin/overview',
        },
        subadmin: {
          overview: '/subadmin/overview',
          tasks: '/subadmin/tasks',
          people: '/subadmin/people',
          'check-ins': '/subadmin/check-ins',
          more: '/subadmin/more',
          availability: '/subadmin/overview',
          handoff: '/subadmin/check-ins',
        },
        employee: {
          'my-day': '/employee/my-day',
          tasks: '/employee/tasks',
          'check-in': '/employee/check-in',
          more: '/employee/more',
          availability: '/employee/more',
          handoff: '/employee/check-in',
        },
      };

      const resolved = routeMap[role][explicitRoute];
      if (resolved) return resolved;
    }

    switch (notification.type) {
      case 'availability':
        return role === 'employee' ? '/employee/more' : role === 'subadmin' ? '/subadmin/overview' : '/admin/overview';
      case 'handoff':
        return role === 'employee' ? '/employee/check-in' : role === 'subadmin' ? '/subadmin/check-ins' : '/admin/overview';
      case 'coverage':
      case 'review':
      case 'task':
      default:
        return `/${rolePrefix}/tasks`;
    }
  };

  const handlePress = (notification: NotificationItem) => {
    markRead(notification.id);
    closeInbox();
    let targetPath = resolveNotificationPath(notification, state.role);

    // When a review notification points to the tasks list, auto-select the Review tab
    if (notification.type === 'review' && !notification.taskId && targetPath.endsWith('/tasks')) {
      targetPath += '?filter=review';
    }

    setTimeout(() => {
      router.push(targetPath);
    }, 100);
  };

  const handleDismiss = (id: string) => {
    dismiss(id);
  };

  const handleSnooze = (id: string, duration: '1h' | '1d' | '1w') => {
    snooze(id, duration);
  };

  if (!showInbox) return null;

  // Apply unread filter
  const filtered = unreadOnly ? notifications.filter((n) => !isRead(n.id)) : notifications;
  const grouped = groupNotifications(filtered);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="flex-1 bg-black/30 dark:bg-black/50" onClick={closeInbox} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Escape' || e.key === 'Enter') closeInbox(); }} aria-label="Close notifications" />
      <div role="dialog" aria-label="Notifications" className="bg-white dark:bg-surface-950 rounded-t-3xl max-h-[75%] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-surface-100 dark:border-surface-800">
          <span className="text-heading text-surface-900 dark:text-surface-100">Inbox</span>
          <button onClick={closeInbox} className="p-1" aria-label="Close notifications">
            <X className="h-5 w-5 text-surface-500 dark:text-surface-400" />
          </button>
        </div>

        {/* Unread filter toggle */}
        <div className="flex items-center px-5 py-2 border-b border-surface-100 dark:border-surface-800">
          <button
            onClick={() => setUnreadOnly((prev) => !prev)}
            className={`text-[12px] font-medium px-2.5 py-1 rounded-lg transition-colors ${
              unreadOnly
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400'
            }`}
          >
            Unread only
          </button>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="px-5 py-4 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={BellOff}
            title={unreadOnly ? 'No unread notifications' : 'No notifications yet'}
            description={unreadOnly
              ? 'All caught up! Switch off the filter to see all notifications.'
              : 'Notifications about tasks, reviews, and updates will appear here'}
          />
        ) : (
          <div className="overflow-auto pb-10">
            {grouped.map(({ group, items }) => (
              <div key={group}>
                <SectionHeader label={group} />
                {items.map((item) => (
                  <NotificationRow
                    key={item.id}
                    notification={item}
                    isUnread={!isRead(item.id)}
                    onPress={() => handlePress(item)}
                    onDismiss={handleDismiss}
                    onSnooze={handleSnooze}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
