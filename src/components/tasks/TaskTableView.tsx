'use client';

import { TaskTableHeader } from './TaskTableHeader';
import { TaskTableRow } from './TaskTableRow';
import { EmptyState } from '../ui/EmptyState';
import type { Task, Role } from '../../types';

interface TaskTableViewProps {
  visibleTasks: Task[];
  totalCount: number;
  visibleCount: number;
  sortKey: string;
  sortDir: 'asc' | 'desc';
  role: Role;
  color: string;
  onSort: (key: string) => void;
  onPress: (id: string) => void;
  onLoadMore: () => void;
}

export function TaskTableView({
  visibleTasks,
  totalCount,
  visibleCount,
  sortKey,
  sortDir,
  role,
  color,
  onSort,
  onPress,
  onLoadMore,
}: TaskTableViewProps) {
  return (
    <>
      <TaskTableHeader sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
      {visibleTasks.length === 0 ? (
        <EmptyState icon="clipboard-outline" title="No tasks" />
      ) : (
        visibleTasks.map((item, index) => (
          <TaskTableRow
            key={item.id}
            task={item}
            role={role}
            onPress={() => onPress(item.id)}
            isLast={index === visibleTasks.length - 1 && totalCount <= visibleCount}
          />
        ))
      )}
      {totalCount > visibleCount && (
        <button
          onClick={onLoadMore}
          className="flex items-center justify-center py-3 mt-1 gap-1 w-full"
        >
          <span className="text-caption" style={{ color }}>
            Load more ({totalCount - visibleCount} remaining)
          </span>
        </button>
      )}
    </>
  );
}
