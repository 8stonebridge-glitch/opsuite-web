'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import type { AppNotification } from '../../types';

// ── Context value ────────────────────────────────────────────────────

interface InboxContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  showInbox: boolean;
  openInbox: () => void;
  closeInbox: () => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  isRead: (id: string) => boolean;
}

const InboxContext = createContext<InboxContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────

export function InboxProvider({ children }: { children: ReactNode }) {
  const [showInbox, setShowInbox] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // No backend — notifications are empty for now (local-only mode)
  const notifications = useMemo<AppNotification[]>(() => [], []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !readIds.has(n.id)).length,
    [notifications, readIds]
  );

  const markRead = useCallback(
    (id: string) => {
      setReadIds((prev) => new Set(prev).add(id));
    },
    []
  );

  const dismiss = useCallback(
    (id: string) => {
      setDismissedIds((prev) => new Set(prev).add(id));
    },
    []
  );

  const markAllRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev);
      notifications.forEach((n) => next.add(n.id));
      return next;
    });
  }, [notifications]);

  const isRead = useCallback(
    (id: string) => readIds.has(id),
    [readIds]
  );

  const openInbox = useCallback(() => setShowInbox(true), []);
  const closeInbox = useCallback(() => setShowInbox(false), []);

  const value = useMemo<InboxContextValue>(
    () => ({ notifications, unreadCount, showInbox, openInbox, closeInbox, markRead, markAllRead, dismiss, isRead }),
    [notifications, unreadCount, showInbox, openInbox, closeInbox, markRead, markAllRead, dismiss, isRead]
  );

  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>;
}

// ── Hook ─────────────────────────────────────────────────────────────

export function useInbox(): InboxContextValue {
  const ctx = useContext(InboxContext);
  if (!ctx) throw new Error('useInbox must be used within InboxProvider');
  return ctx;
}
