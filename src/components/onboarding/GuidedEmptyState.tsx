'use client';

import { EmptyState } from '@/components/ui/EmptyState';

type GuidedRole = 'admin' | 'subadmin' | 'employee';

interface GuidedEmptyStateProps {
  role: GuidedRole;
  section: string;
  /** Called when the primary CTA is clicked (e.g. navigate to invite page) */
  onAction?: () => void;
}

interface EmptyStateContent {
  title: string;
  description: string;
  actionLabel?: string;
}

/**
 * Content map keyed by `${role}:${section}`.
 * Falls through to a generic default when no match is found.
 */
const CONTENT_MAP: Record<string, EmptyStateContent> = {
  'admin:approvals': {
    title: 'No approvals waiting',
    description:
      'Once team members submit tasks, they\u2019ll appear here for your review.',
    actionLabel: 'Invite team members',
  },
  'admin:tasks': {
    title: 'No tasks yet',
    description: 'Create your first task to get started.',
    actionLabel: 'Create task',
  },
  'employee:tasks': {
    title: 'No tasks assigned to you yet',
    description: 'Your manager will assign tasks soon.',
  },
  'subadmin:tasks': {
    title: 'No team tasks yet',
    description: 'Create a task for your team to get things moving.',
    actionLabel: 'Create task',
  },
};

const DEFAULT_CONTENT: EmptyStateContent = {
  title: 'Nothing here yet',
  description: 'Content will appear here once there is something to show.',
};

export function GuidedEmptyState({ role, section, onAction }: GuidedEmptyStateProps) {
  const key = `${role}:${section}`;
  const content = CONTENT_MAP[key] ?? DEFAULT_CONTENT;

  return (
    <EmptyState
      title={content.title}
      description={content.description}
      action={
        content.actionLabel && onAction
          ? { label: content.actionLabel, onClick: onAction }
          : undefined
      }
    />
  );
}
