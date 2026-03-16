'use client';

import { useTheme } from '../../providers/ThemeProvider';

interface TaskTableHeaderProps {
  sortKey: string;
  sortDir: 'asc' | 'desc';
  onSort: (key: string) => void;
}

const COLUMNS: { key: string; label: string; flex: number }[] = [
  { key: 'title', label: 'Task', flex: 1 },
  { key: 'status', label: 'Status', flex: 0 },
  { key: 'due', label: 'Due', flex: 0 },
];

export function TaskTableHeader({ sortKey, sortDir, onSort }: TaskTableHeaderProps) {
  const { isDark } = useTheme();
  return (
    <div className="flex items-center px-3 py-2 bg-surface-50 dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700 sticky top-0 z-10">
      {/* Spacer for priority dot */}
      <div style={{ width: 14 }} />

      {COLUMNS.map((col) => {
        const isActive = sortKey === col.key;
        return (
          <button
            key={col.key}
            onClick={() => onSort(col.key)}
            className="flex items-center gap-0.5"
            style={
              col.flex === 1
                ? { flex: 1, marginRight: 8 }
                : col.key === 'status'
                ? { marginRight: 8 }
                : { width: 80, justifyContent: 'flex-end' }
            }
          >
            <span
              className={`text-[10px] uppercase tracking-wider font-semibold ${
                isActive ? 'text-surface-700 dark:text-surface-300' : 'text-surface-400 dark:text-surface-500'
              }`}
            >
              {col.label}
            </span>
            {isActive && (
              <span style={{ color: isDark ? '#d1d5db' : '#374151', fontSize: 10 }}>
                {sortDir === 'asc' ? '\u25B2' : '\u25BC'}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
