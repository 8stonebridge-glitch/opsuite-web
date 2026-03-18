'use client';

import { useRouter } from 'next/navigation';
import { useInbox } from './InboxProvider';
import { useApp } from '../../store/AppContext';
import type { AppNotification, Role } from '../../types';
import { ClipboardList, Calendar, ArrowLeftRight, AlertCircle, CheckCircle, BellOff, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

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

// ── Icon for notification type ───────────────────────────────────────

const NOTIFICATION_ICONS: Record<string, LucideIcon> = {
  task: ClipboardList,
  availability: Calendar,
  handoff: ArrowLeftRight,
  coverage: AlertCircle,
  review: CheckCircle,
};

function IconForType({ type }: { type: AppNotification['type'] }) {
  const Icon = NOTIFICATION_ICONS[type] || ClipboardList;
  return <Icon className="h-4 w-4 text-surface-500 dark:text-surface-400" />;
}

// ── Single row ───────────────────────────────────────────────────────

function NotificationRow({
  notification,
  isUnread,
  onPress,
  onDismiss,
}: {
  notification: AppNotification;
  isUnread: boolean;
  onPress: () => void;
  onDismiss: () => void;
}) {
  return (
    <button
      onClick={onPress}
      className="flex items-center px-5 py-3.5 hover:bg-surface-50 dark:hover:bg-surface-800 w-full text-left"
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
        <span className="text-[11px] text-surface-400 dark:text-surface-500 mt-1 block" suppressHydrationWarning>
          {relativeTime(notification.timestamp)}
        </span>
      </div>

      {/* Dismiss button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        className="p-1.5 flex-shrink-0"
      >
        <X className="h-4 w-4 text-surface-400 dark:text-surface-500" />
      </button>
    </button>
  );
}

// ── Sheet ────────────────────────────────────────────────────────────

export function InboxSheet() {
  const { notifications, showInbox, closeInbox, markRead, dismiss, isRead } = useInbox();
  const { state } = useApp();
  const router = useRouter();

  const resolveNotificationPath = (notification: AppNotification, role: Role) => {
    const rolePrefix =
      role === 'admin'
        ? '(owner_admin)'
        : role === 'subadmin'
        ? '(subadmin)'
        : '(employee)';

    if (notification.taskId) {
      return `/${rolePrefix}/tasks/${notification.taskId}`;
    }

    const explicitRoute = notification.route?.replace(/^\/+/, '');
    if (explicitRoute) {
      const routeMap: Record<Role, Record<string, string>> = {
        admin: {
          overview: '/(owner_admin)/overview',
          tasks: '/(owner_admin)/tasks',
          people: '/(owner_admin)/people',
          sites: '/(owner_admin)/sites',
          more: '/(owner_admin)/more',
          availability: '/(owner_admin)/overview',
          handoff: '/(owner_admin)/overview',
        },
        subadmin: {
          overview: '/(subadmin)/overview',
          tasks: '/(subadmin)/tasks',
          people: '/(subadmin)/people',
          'check-ins': '/(subadmin)/check-ins',
          more: '/(subadmin)/more',
          availability: '/(subadmin)/overview',
          handoff: '/(subadmin)/check-ins',
        },
        employee: {
          'my-day': '/(employee)/my-day',
          tasks: '/(employee)/tasks',
          'check-in': '/(employee)/check-in',
          more: '/(employee)/more',
          availability: '/(employee)/more',
          handoff: '/(employee)/check-in',
        },
      };

      const resolved = routeMap[role][explicitRoute];
      if (resolved) return resolved;
    }

    switch (notification.type) {
      case 'availability':
        return role === 'employee' ? '/(employee)/more' : role === 'subadmin' ? '/(subadmin)/overview' : '/(owner_admin)/overview';
      case 'handoff':
        return role === 'employee' ? '/(employee)/check-in' : role === 'subadmin' ? '/(subadmin)/check-ins' : '/(owner_admin)/overview';
      case 'coverage':
      case 'review':
      case 'task':
      default:
        return `/${rolePrefix}/tasks`;
    }
  };

  const handlePress = (notification: AppNotification) => {
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

  if (!showInbox) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="flex-1 bg-black/30 dark:bg-black/50" onClick={closeInbox} />
      <div className="bg-white dark:bg-surface-950 rounded-t-3xl max-h-[75%] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-surface-100 dark:border-surface-800">
          <span className="text-heading text-surface-900 dark:text-surface-100">Inbox</span>
          <button onClick={closeInbox} className="p-1">
            <X className="h-5 w-5 text-surface-500 dark:text-surface-400" />
          </button>
        </div>

        {/* List */}
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <BellOff className="h-10 w-10 text-surface-300 dark:text-surface-600" />
            <span className="text-caption text-surface-400 dark:text-surface-500 mt-3">No notifications yet</span>
          </div>
        ) : (
          <div className="overflow-auto pb-10">
            {notifications.map((item) => (
              <NotificationRow
                key={item.id}
                notification={item}
                isUnread={!isRead(item.id)}
                onPress={() => handlePress(item)}
                onDismiss={() => handleDismiss(item.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
