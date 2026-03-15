'use client';

import { ScoreBadge } from './ScoreBadge';
import { useAllEmployees } from '../../store/selectors';
import { useTheme } from '../../providers/ThemeProvider';
import type { EmployeePerformance } from '../../types';

interface AtRiskSectionProps {
  employees: EmployeePerformance[];
  limit?: number;
}

export function AtRiskSection({ employees, limit = 5 }: AtRiskSectionProps) {
  if (employees.length === 0) return null;

  const allEmployees = useAllEmployees();
  const { isDark } = useTheme();
  const preview = employees.slice(0, limit);

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-amber-600 text-sm">&#9888;</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
          At-Risk Employees · {employees.length}
        </span>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {preview.map((perf, idx) => {
          const emp = allEmployees.find((e) => e.id === perf.employeeId);
          const topAction = perf.actions[0];
          const isLast = idx === preview.length - 1;

          return (
            <div
              key={perf.employeeId}
              className={`flex items-center px-3 py-2.5 ${!isLast ? 'border-b border-gray-50 dark:border-gray-800' : ''}`}
            >
              {/* Avatar */}
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 8,
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 600, color: isDark ? '#9ca3af' : '#6b7280' }}>
                  {(emp?.name || '?').charAt(0)}
                </span>
              </div>

              {/* Name + action */}
              <div className="flex-1 mr-2 min-w-0">
                <span className="text-sm text-gray-900 dark:text-gray-100 block truncate">
                  {emp?.name || 'Unknown'}
                </span>
                {topAction && (
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 block truncate">
                    {topAction.label} — {topAction.target}
                  </span>
                )}
              </div>

              {/* Score badge */}
              <ScoreBadge score={perf.score} band={perf.band} size="sm" />
            </div>
          );
        })}
      </div>

      {employees.length > limit && (
        <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-1">
          +{employees.length - limit} more
        </p>
      )}
    </div>
  );
}
