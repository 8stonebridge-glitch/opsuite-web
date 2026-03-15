'use client';

import { StatusBadge } from '../ui/Badge';
import { isOverdue, dueLabel } from '../../utils/date';
import { useIndustryColor } from '../../store/selectors';
import { useTheme } from '../../providers/ThemeProvider';
import type { Task, TaskStatus } from '../../types';

const STATUS_COLORS: Record<TaskStatus, string> = {
  'Open': '#6b7280',
  'In Progress': '#3b82f6',
  'Completed': '#059669',
  'Verified': '#9ca3af',
  'Pending Approval': '#d97706',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#dc2626',
  medium: '#d97706',
  low: '#9ca3af',
};

interface QuickActions {
  onUpdate: () => void;
  onNoChange: () => void;
  engaged: boolean;
}

interface TaskCardProps {
  task: Task;
  onPress: () => void;
  quickActions?: QuickActions;
  stalledDays?: number;
  assigneeAway?: boolean;
  coverageNeeded?: boolean;
}

export function TaskCard({ task, onPress, quickActions, stalledDays, assigneeAway, coverageNeeded }: TaskCardProps) {
  const overdue = isOverdue(task.due, task.status);
  const industryColor = useIndustryColor();
  const { isDark } = useTheme();
  const borderColor = overdue ? '#dc2626' : STATUS_COLORS[task.status] || industryColor;
  const due = dueLabel(task.due, task.status);

  return (
    <button
      onClick={onPress}
      className={`bg-white dark:bg-gray-900 rounded-2xl mb-2 hover:bg-gray-50 dark:hover:bg-gray-800 overflow-hidden w-full text-left ${
        overdue ? 'border border-red-100 dark:border-red-900' : 'border border-gray-100 dark:border-gray-800'
      }`}
      style={overdue ? { backgroundColor: isDark ? '#1a0505' : '#fef2f2' } : undefined}
    >
      <div className="flex">
        {/* Status color strip */}
        <div style={{ width: 4, backgroundColor: borderColor }} />

        <div className="flex-1 p-4">
          {/* Title row */}
          <div className="flex items-center gap-2">
            <div
              style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: PRIORITY_COLORS[task.priority] || '#9ca3af' }}
            />
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex-1 truncate">
              {task.title}
            </span>
            <StatusBadge status={task.status} />
            {task.reworked && (
              <div className="bg-amber-100 dark:bg-amber-950 rounded-full px-2 py-0.5">
                <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">R{task.reworkCount || 1}</span>
              </div>
            )}
            {stalledDays != null && stalledDays > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950 rounded-full px-2 py-0.5">
                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">Stalled {stalledDays}d</span>
              </div>
            )}
            {coverageNeeded && (
              <div className="bg-orange-50 dark:bg-orange-950 rounded-full px-2 py-0.5">
                <span className="text-[10px] font-semibold text-orange-600 dark:text-orange-400">Coverage</span>
              </div>
            )}
            {assigneeAway && !coverageNeeded && (
              <div className="bg-blue-50 dark:bg-blue-950 rounded-full px-2 py-0.5">
                <span className="text-[10px] font-semibold text-blue-500 dark:text-blue-400">Away</span>
              </div>
            )}
          </div>

          {/* Quick actions for handoff */}
          {quickActions && !quickActions.engaged && (
            <div className="flex gap-2 mt-2 ml-4">
              <button
                onClick={(e) => { e.stopPropagation(); quickActions.onUpdate(); }}
                className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950 rounded-lg"
              >
                <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">Update</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); quickActions.onNoChange(); }}
                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg"
              >
                <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">No change</span>
              </button>
            </div>
          )}
          {quickActions?.engaged && (
            <div className="flex items-center gap-1 mt-2 ml-4">
              <span className="text-green-600 text-xs">&#10003;</span>
              <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">Reviewed</span>
            </div>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-2 ml-4 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="text-gray-400 dark:text-gray-500 text-[11px]">&#9679;</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">{task.assignee}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-400 dark:text-gray-500 text-[11px]">&#9679;</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">{task.site}</span>
            </div>
            {due && (
              <div className="flex items-center gap-1">
                <span style={{ color: due.urgent ? '#dc2626' : isDark ? '#6b7280' : '#9ca3af', fontSize: 11 }}>&#9679;</span>
                <span className={`text-xs ${due.urgent ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
                  {due.text}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Chevron */}
        <div className="flex items-center pr-3">
          <span style={{ color: isDark ? '#4b5563' : '#d1d5db', fontSize: 16 }}>&rsaquo;</span>
        </div>
      </div>
    </button>
  );
}
