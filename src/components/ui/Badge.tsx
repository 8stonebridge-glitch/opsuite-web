'use client';

import type { TaskStatus } from '../../types';
import type { ReactNode } from 'react';

/* ── Generic Badge ── */

interface BadgeProps {
  label: string;
  color: string;
  variant?: 'soft' | 'solid' | 'outline';
  size?: 'sm' | 'md';
  icon?: ReactNode;
}

export function Badge({ label, color, variant = 'soft', size = 'md', icon }: BadgeProps) {
  const pad = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-0.5';
  const textCls = size === 'sm' ? 'text-micro font-medium' : 'text-caption font-medium';

  const style: React.CSSProperties =
    variant === 'solid'
      ? { backgroundColor: color, color: '#fff' }
      : variant === 'outline'
        ? { borderColor: color, color, borderWidth: 1 }
        : { backgroundColor: `${color}14`, color }; // 14 = ~8% opacity in hex

  return (
    <span
      className={`rounded-pill inline-flex items-center gap-1 ${pad} ${textCls}`}
      style={style}
    >
      {icon}
      {label}
    </span>
  );
}

/* ── StatusBadge ── */

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'Open': { bg: 'bg-blue-50 dark:bg-blue-950', text: 'text-blue-600 dark:text-blue-400' },
  'In Progress': { bg: 'bg-amber-50 dark:bg-amber-950', text: 'text-amber-600 dark:text-amber-400' },
  'Pending Approval': { bg: 'bg-purple-50 dark:bg-purple-950', text: 'text-purple-600 dark:text-purple-400' },
  'Completed': { bg: 'bg-emerald-50 dark:bg-emerald-950', text: 'text-emerald-600 dark:text-emerald-400' },
  'Verified': { bg: 'bg-surface-200 dark:bg-surface-800', text: 'text-surface-600 dark:text-surface-400' },
};

const STATUS_SHORT: Record<string, string> = {
  'Open': 'Open',
  'In Progress': 'Active',
  'Pending Approval': 'Pending',
  'Completed': 'Done',
  'Verified': 'Verified',
};

interface StatusBadgeProps {
  status: TaskStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status] || { bg: 'bg-surface-100 dark:bg-surface-800', text: 'text-surface-500 dark:text-surface-400' };
  const label = STATUS_SHORT[status] || status;

  return (
    <span className={`rounded-pill px-2.5 py-0.5 inline-flex text-caption font-medium ${colors.bg} ${colors.text}`}>
      {label}
    </span>
  );
}

/* ── PriorityBadge ── */

interface PriorityBadgeProps {
  priority: string;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    critical: { bg: 'bg-danger-50 dark:bg-danger-950', text: 'text-danger-600 dark:text-danger-400', label: 'High' },
    medium: { bg: 'bg-warning-50 dark:bg-warning-950', text: 'text-warning-600 dark:text-warning-400', label: 'Medium' },
    low: { bg: 'bg-brand-50 dark:bg-brand-950', text: 'text-brand-600 dark:text-brand-400', label: 'Low' },
  };
  const cfg = map[priority] || map.medium;

  return (
    <span className={`rounded-pill px-2.5 py-0.5 inline-flex text-caption font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}
