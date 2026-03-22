'use client';

import type { FilterValue } from '../../types';
export type { FilterValue };

interface TaskFiltersProps {
  value: FilterValue;
  onChange: (v: FilterValue) => void;
  color?: string;
  counts?: { active: number; review: number; done: number };
}

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
];

export function TaskFilters({ value, onChange, color = '#059669', counts }: TaskFiltersProps) {
  return (
    <div className="flex rounded-card bg-surface-200 dark:bg-surface-800 p-1 mb-4">
      {FILTERS.map((f) => {
        const isActive = value === f.value;
        const count = counts?.[f.value];
        return (
          <button
            key={f.value}
            onClick={() => onChange(f.value)}
            className={`flex-1 py-2.5 rounded-xl text-center ${isActive ? 'bg-white dark:bg-surface-900 shadow-sm' : ''}`}
          >
            <span className={`text-caption ${isActive ? 'text-surface-900 dark:text-surface-100' : 'text-surface-500 dark:text-surface-400'}`}>
              {f.label}
              {count !== undefined ? (
                <span className={`font-normal ${isActive ? 'text-surface-400 dark:text-surface-500' : 'text-surface-400 dark:text-surface-500'}`}>
                  {' '}{count}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
