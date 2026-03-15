'use client';

import { TaskCard } from '../tasks/TaskCard';
import type { Task } from '../../types';

interface TaskPreviewSectionProps {
  title: string;
  tasks: Task[];
  limit?: number;
  onTaskPress: (taskId: string) => void;
  onViewAll?: () => void;
  titleColor?: string;
  icon?: string;
  iconColor?: string;
}

export function TaskPreviewSection({
  title,
  tasks,
  limit = 5,
  onTaskPress,
  onViewAll,
  titleColor = '#6b7280',
}: TaskPreviewSectionProps) {
  if (tasks.length === 0) return null;

  const preview = tasks.slice(0, limit);
  const remaining = tasks.length - preview.length;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: titleColor }}
        >
          {title} · {tasks.length}
        </span>
      </div>

      {preview.map((task) => (
        <TaskCard key={task.id} task={task} onPress={() => onTaskPress(task.id)} />
      ))}

      {remaining > 0 && onViewAll && (
        <button onClick={onViewAll} className="flex items-center justify-center py-2 mt-1 w-full" type="button">
          <span className="text-xs font-medium text-gray-400">
            View all ({tasks.length})
          </span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}
