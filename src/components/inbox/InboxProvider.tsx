'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../lib/convexApi';
import type { NotificationItem } from '../../lib/convexApiTypes';
import type { Id } from '../../lib/convexApiTypes';

// ── Context value ────────────────────────────────────────────────────

interface InboxContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  showInbox: boolean;
  openInbox: () => void;
  closeInbox: () => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  snooze: (id: string, duration: '1h' | '1d' | '1w') => void;
  isRead: (id: string) => boolean;
}

const InboxContext = createContext<InboxContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────

export function InboxProvider({ children }: { children: ReactNode }) {
  const [showInbox, setShowInbox] = useState(false);

  // Real-time Convex queries
  const notificationsData = useQuery(api.notifications.list, { limit: 50 });
  const unreadCountData = useQuery(api.notifications.unreadCount, {});

  // Convex mutations
  const markReadMutation = useMutation(api.notifications.markRead);
  const markAllReadMutation = useMutation(api.notifications.markAllRead);
  const dismissMutation = useMutation(api.notifications.dismiss);
  const snoozeMutation = useMutation(api.notifications.snooze);

  const notifications = useMemo<NotificationItem[]>(
    () => notificationsData ?? [],
    [notificationsData],
  );

  const unreadCount = unreadCountData ?? 0;

  const markRead = useCallback(
    (id: string) => {
      void markReadMutation({ notificationId: id as Id<'notifications'> });
    },
    [markReadMutation],
  );

  const dismiss = useCallback(
    (id: string) => {
      void dismissMutation({ notificationId: id as Id<'notifications'> });
    },
    [dismissMutation],
  );

  const snooze = useCallback(
    (id: string, duration: '1h' | '1d' | '1w') => {
      void snoozeMutation({ notificationId: id as Id<'notifications'>, duration });
    },
    [snoozeMutation],
  );

  const markAllRead = useCallback(() => {
    void markAllReadMutation({});
  }, [markAllReadMutation]);

  const isRead = useCallback(
    (id: string) => {
      const notification = notifications.find((n) => n.id === id);
      return notification?.isRead ?? false;
    },
    [notifications],
  );

  const openInbox = useCallback(() => setShowInbox(true), []);
  const closeInbox = useCallback(() => setShowInbox(false), []);

  const isLoading = notificationsData === undefined;

  const value = useMemo<InboxContextValue>(
    () => ({ notifications, unreadCount, isLoading, showInbox, openInbox, closeInbox, markRead, markAllRead, dismiss, snooze, isRead }),
    [notifications, unreadCount, isLoading, showInbox, openInbox, closeInbox, markRead, markAllRead, dismiss, snooze, isRead],
  );

  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>;
}

// ── Hook ─────────────────────────────────────────────────────────────

const FALLBACK: InboxContextValue = {
  notifications: [],
  unreadCount: 0,
  isLoading: true,
  markRead: async () => {},
  markAllRead: async () => {},
  dismiss: async () => {},
  snooze: async () => {},
  showInbox: false,
  openInbox: () => {},
  closeInbox: () => {},
  isRead: () => true,
};

export function useInbox(): InboxContextValue {
  const ctx = useContext(InboxContext);
  // Return safe fallback during SSR/prerender instead of throwing
  if (!ctx) return FALLBACK;
  return ctx;
}
