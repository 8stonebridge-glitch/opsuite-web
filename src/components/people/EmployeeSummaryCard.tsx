'use client';

import { Avatar } from '../ui/Avatar';
import { ScoreBadge } from '../performance/ScoreBadge';
import { useTheme } from '../../providers/ThemeProvider';
import type { EmployeeSummary } from '../../store/selectors';
import type { ScoreBand } from '../../types';

interface Props {
  name: string;
  teamColor: string;
  summary: EmployeeSummary;
  isLead?: boolean;
  last?: boolean;
  score?: number;
  band?: ScoreBand;
  topAction?: string;
  siteName?: string;
  availabilityBadge?: { label: string; color: string } | null;
  onPress?: () => void;
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return '\u2014';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export function EmployeeSummaryCard({ name, teamColor, summary, isLead, last, score, band, topAction, siteName, availabilityBadge, onPress }: Props) {
  const { isDark } = useTheme();
  const Tag = onPress ? 'button' : 'div';
  return (
    <Tag
      {...(onPress ? { onClick: onPress } : {})}
      className={`flex items-center py-3 gap-3 w-full text-left ${last ? '' : 'border-b border-gray-100 dark:border-gray-800'}`}
    >
      <Avatar name={name} color={teamColor} size="sm" />
      <div className="flex-1 space-y-0.5">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{name}</span>
          {isLead && (
            <div className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
              <span className="text-[9px] font-semibold text-gray-500 dark:text-gray-400">LEAD</span>
            </div>
          )}
          {availabilityBadge && (
            <div className="px-1.5 py-0.5 rounded" style={{ backgroundColor: availabilityBadge.color + '15' }}>
              <span className="text-[9px] font-semibold" style={{ color: availabilityBadge.color }}>
                {availabilityBadge.label}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {siteName && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {siteName} ·
            </span>
          )}
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {summary.activeCount} active
          </span>
          {summary.overdueCount > 0 && (
            <span className="text-xs text-red-500">
              {summary.overdueCount} overdue
            </span>
          )}
          <span className="text-xs text-gray-300 dark:text-gray-600">
            {relativeTime(summary.lastActivity)}
          </span>
        </div>
      </div>
      {/* Score badge or check-in dot */}
      {score !== undefined && band ? (
        <ScoreBadge score={score} band={band} size="sm" />
      ) : (
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{
            backgroundColor: summary.checkedInToday ? '#059669' : isDark ? '#4b5563' : '#d1d5db',
          }}
        />
      )}
    </Tag>
  );
}
