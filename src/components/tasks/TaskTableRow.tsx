'use client';

import { StatusBadge } from '../ui/Badge';
import { isOverdue, dueLabel } from '../../utils/date';
import type { Task, Role } from '../../types';

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#dc2626',
  medium: '#d97706',
  low: '#9ca3af',
};

interface TaskTableRowProps {
  task: Task;
  role: Role;
  onPress: () => void;
  isLast?: boolean;
}

export function TaskTableRow({ task, role, onPress, isLast }: TaskTableRowProps) {
  const overdue = isOverdue(task.due, task.status);
  const due = dueLabel(task.due, task.status);

  // Role-contextual secondary info
  let meta = '';
  if (role === 'admin') {
    meta = [task.assignee, task.site].filter(Boolean).join(' · ');
  } else if (role === 'subadmin') {
    meta = task.assignee;
  } else {
    meta = task.site || '';
  }

  return (
    <button
      onClick={onPress}
      className={`flex items-center px-3 py-2.5 hover:bg-surface-50 dark:hover:bg-surface-800 w-full text-left ${
        !isLast ? 'border-b border-surface-100 dark:border-surface-800' : ''
      }`}
      style={overdue ? { backgroundColor: '#fef2f2' } : undefined}
    >
      {/* Priority dot */}
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: PRIORITY_COLORS[task.priority] || '#9ca3af',
          marginRight: 8,
          flexShrink: 0,
        }}
      />

      {/* Title + meta */}
      <div className="flex-1 mr-2 min-w-0">
        <span className="text-body text-surface-900 dark:text-surface-100 block truncate">
          {task.title}
        </span>
        {meta ? (
          <span className="text-[10px] text-surface-400 dark:text-surface-500 mt-0.5 block truncate">
            {meta}
          </span>
        ) : null}
      </div>

      {/* Status badge */}
      <div className="mr-2 flex-shrink-0">
        <StatusBadge status={task.status} />
      </div>

      {/* Due */}
      <div style={{ width: 80, textAlign: 'right', flexShrink: 0 }}>
        {due ? (
          <span
            className={`text-[10px] ${
              due.urgent ? 'text-red-600 font-semibold' : 'text-surface-400 dark:text-surface-500'
            }`}
          >
            {due.text}
          </span>
        ) : (
          <span className="text-[10px] text-surface-300 dark:text-surface-600">&mdash;</span>
        )}
      </div>
    </button>
  );
}
