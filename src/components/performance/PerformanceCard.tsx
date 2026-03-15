'use client';

import { useState } from 'react';
import { ScoreBadge, BandLabel } from './ScoreBadge';
import { useTheme } from '../../providers/ThemeProvider';
import type { EmployeePerformance, ScoreBand } from '../../types';

const SEVERITY_DOT: Record<ScoreBand, string> = {
  red: '#dc2626',
  amber: '#d97706',
  green: '#059669',
};

interface PerformanceCardProps {
  performance: EmployeePerformance;
  /** Compact mode shows score + top 2 actions only (for employee my-day) */
  compact?: boolean;
  color?: string;
}

export function PerformanceCard({ performance, compact, color = '#059669' }: PerformanceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { isDark } = useTheme();
  const { score, band, trendDelta, metrics, actions } = performance;

  const displayActions = compact ? actions.slice(0, 2) : actions;

  return (
    <div
      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
      style={{ borderLeftWidth: 3, borderLeftColor: SEVERITY_DOT[band] }}
    >
      {/* Header */}
      <div className="flex items-center flex-wrap px-4 py-3 gap-3">
        <ScoreBadge score={score} band={band} trendDelta={trendDelta} size={compact ? 'md' : 'md'} />
        <div className="flex-1">
          <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {compact ? 'My Performance' : 'Performance Score'}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <BandLabel band={band} />
            {trendDelta !== 0 && (
              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                {trendDelta > 0 ? '\u25B2' : '\u25BC'} {Math.abs(trendDelta)} from last week
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Metric breakdown (expandable) */}
      {!compact && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center justify-between px-4 py-2 border-t border-gray-50 dark:border-gray-800 w-full text-left"
        >
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Score Breakdown</span>
          <span style={{ color: isDark ? '#6b7280' : '#9ca3af', fontSize: 14 }}>
            {expanded ? '\u25B2' : '\u25BC'}
          </span>
        </button>
      )}

      {expanded && !compact && (
        <div className="px-4 pb-3">
          {/* Execution */}
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1">
            Execution (50%)
          </span>
          <MetricRow label="Overdue rate" value={`${Math.round(metrics.overdueRate * 100)}%`} good={metrics.overdueRate === 0} />
          <MetricRow label="On-time completion" value={`${Math.round(metrics.onTimeCompletionRate * 100)}%`} good={metrics.onTimeCompletionRate >= 0.8} />
          <MetricRow label="Critical response" value={`${Math.round(metrics.criticalResponseRate * 100)}%`} good={metrics.criticalResponseRate >= 0.8} />
          <MetricRow label="Stale tasks" value={`${metrics.staleActiveCount}`} good={metrics.staleActiveCount === 0} />

          {/* Discipline */}
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1 mt-2">
            Discipline (50%)
          </span>
          <MetricRow label="Check-in compliance" value={`${Math.round(metrics.checkInComplianceRate * 100)}%`} good={metrics.checkInComplianceRate >= 0.8} />
          <MetricRow label="Update consistency" value={`${Math.round(metrics.updateConsistencyRate * 100)}%`} good={metrics.updateConsistencyRate >= 0.8} />
          <MetricRow label="Rework rate" value={`${Math.round(metrics.reworkRate * 100)}%`} good={metrics.reworkRate <= 0.2} />
          <MetricRow label="Handoff response" value={`${Math.round(metrics.handoffResponseRate * 100)}%`} good={metrics.handoffResponseRate >= 0.8} />
        </div>
      )}

      {/* Action items */}
      {displayActions.length > 0 && (
        <div className="border-t border-gray-50 dark:border-gray-800 px-4 py-2">
          {compact && (
            <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1.5">
              Improve your score
            </span>
          )}
          {displayActions.map((action) => (
            <div key={action.id} className="flex items-center flex-wrap gap-2 py-1">
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: SEVERITY_DOT[action.severity],
                }}
              />
              <span className="text-xs text-gray-700 dark:text-gray-300 flex-1 truncate">
                {action.label}
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500">{action.target}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Metric row helper ───────────────────────────────────────────────

function MetricRow({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <span className={`text-xs font-medium ${good ? 'text-emerald-600' : 'text-amber-600'}`}>
        {value}
      </span>
    </div>
  );
}
