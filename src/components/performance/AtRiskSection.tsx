'use client';

import { ScoreBadge } from './ScoreBadge';
import { useAllEmployees } from '../../store/selectors';
import { Avatar } from '../ui/Avatar';
import type { EmployeePerformance } from '../../types';
import { AlertTriangle } from 'lucide-react';

interface AtRiskSectionProps {
  employees: EmployeePerformance[];
  limit?: number;
}

export function AtRiskSection({ employees, limit = 5 }: AtRiskSectionProps) {
  const allEmployees = useAllEmployees();

  if (employees.length === 0) return null;
  const preview = employees.slice(0, limit);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-4 rounded-full bg-amber-500" />
        <AlertTriangle className="size-3.5 text-amber-600" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-600">
          At-Risk Employees
        </h2>
        <span className="text-xs font-medium text-amber-400">
          {employees.length}
        </span>
      </div>

      <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-100 dark:border-surface-800 overflow-hidden">
        {preview.map((perf, idx) => {
          const emp = allEmployees.find((e) => e.id === perf.employeeId);
          const topAction = perf.actions[0];
          const isLast = idx === preview.length - 1;

          return (
            <div
              key={perf.employeeId}
              className={`flex items-center px-4 py-3 ${!isLast ? 'border-b border-surface-100 dark:border-surface-800' : ''}`}
            >
              <Avatar name={emp?.name || '?'} color="#9ca3af" size="sm" />

              <div className="flex-1 ml-3 mr-3 min-w-0">
                <span className="text-caption font-medium text-surface-900 dark:text-surface-100 block truncate">
                  {emp?.name || 'Unknown'}
                </span>
                {topAction && (
                  <span className="text-[11px] text-surface-400 dark:text-surface-500 mt-0.5 block truncate">
                    {topAction.label} — {topAction.target}
                  </span>
                )}
              </div>

              <ScoreBadge score={perf.score} band={perf.band} size="sm" />
            </div>
          );
        })}
      </div>

      {employees.length > limit && (
        <p className="text-[11px] text-surface-400 dark:text-surface-500 text-center mt-2">
          +{employees.length - limit} more
        </p>
      )}
    </div>
  );
}
