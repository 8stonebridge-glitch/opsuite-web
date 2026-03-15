'use client';

import type { TaskStatus } from '../../types';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'Open': { bg: 'bg-blue-50 dark:bg-blue-950', text: 'text-blue-600 dark:text-blue-400' },
  'In Progress': { bg: 'bg-amber-50 dark:bg-amber-950', text: 'text-amber-600 dark:text-amber-400' },
  'Pending Approval': { bg: 'bg-purple-50 dark:bg-purple-950', text: 'text-purple-600 dark:text-purple-400' },
  'Completed': { bg: 'bg-emerald-50 dark:bg-emerald-950', text: 'text-emerald-600 dark:text-emerald-400' },
  'Verified': { bg: 'bg-green-50 dark:bg-green-950', text: 'text-green-600 dark:text-green-400' },
};

const STATUS_SHORT: Record<string, string> = {
  'Open': 'Open',
  'In Progress': 'Active',
  'Pending Approval': 'Pending',
  'Completed': 'Done',
  'Verified': 'Verified',
};

interface BadgeProps {
  status: TaskStatus;
}

export function StatusBadge({ status }: BadgeProps) {
  const colors = STATUS_COLORS[status] || { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500 dark:text-gray-400' };
  const label = STATUS_SHORT[status] || status;

  return (
    <div className={`rounded-full px-2.5 py-0.5 inline-flex ${colors.bg}`}>
      <span className={`text-xs font-medium ${colors.text}`}>{label}</span>
    </div>
  );
}

interface PriorityBadgeProps {
  priority: string;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    critical: { bg: 'bg-red-50 dark:bg-red-950', text: 'text-red-600 dark:text-red-400', label: 'High' },
    medium: { bg: 'bg-amber-50 dark:bg-amber-950', text: 'text-amber-600 dark:text-amber-400', label: 'Medium' },
    low: { bg: 'bg-emerald-50 dark:bg-emerald-950', text: 'text-emerald-600 dark:text-emerald-400', label: 'Low' },
  };
  const cfg = map[priority] || map.medium;

  return (
    <div className={`rounded-full px-2.5 py-0.5 inline-flex ${cfg.bg}`}>
      <span className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
    </div>
  );
}
