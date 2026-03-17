'use client';

import type { Team, Employee } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { ScoreBadge } from '@/components/performance/ScoreBadge';

interface TeamStats {
  allMembers: Employee[];
  visible: Employee[];
  remaining: number;
  isShowingAll: boolean;
  teamActive: number;
  teamOverdue: number;
  avgScore: number;
  band: 'green' | 'amber' | 'red';
  atRisk: number;
}

interface Props {
  team: Team;
  stats: TeamStats;
  isExpanded: boolean;
  onToggle: () => void;
  onShowAll: () => void;
  renderMember: (member: Employee, idx: number, isLast: boolean) => React.ReactNode;
}

export function TeamRow({ team, stats, isExpanded, onToggle, onShowAll, renderMember }: Props) {
  const { allMembers, visible, remaining, isShowingAll, teamActive, teamOverdue, avgScore, band, atRisk } = stats;

  return (
    <div className="mb-3">
      <button onClick={onToggle} className="w-full text-left">
        <Card>
          <div className="flex items-center gap-3 px-4 -my-1">
            <Avatar name={team.name} color={team.color} />
            <div className="flex-1 min-w-0">
              <p className="text-body font-semibold text-surface-900 dark:text-surface-100 truncate">{team.name}</p>
              <p className="text-caption text-surface-400 dark:text-surface-500 truncate">
                {allMembers.length} {allMembers.length === 1 ? 'person' : 'people'} · {teamActive} active
                {teamOverdue > 0 ? ` · ${teamOverdue} overdue` : ''}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <ScoreBadge score={avgScore} band={band} size="sm" />
              {atRisk > 0 && <span className="text-[9px] text-amber-500 font-medium">{atRisk} at risk</span>}
            </div>
            <span className="text-surface-400 text-caption flex items-center justify-center w-10 h-10 shrink-0">
              {isExpanded ? '▲' : '▼'}
            </span>
          </div>
        </Card>
      </button>

      {isExpanded && (
        <Card className="mt-1.5 ml-2">
          {visible.map((member, idx) =>
            renderMember(member, idx, idx === visible.length - 1 && remaining <= 0),
          )}
          {remaining > 0 && !isShowingAll && (
            <button onClick={onShowAll} className="py-2 w-full text-center">
              <span className="text-caption font-medium text-surface-400">
                View all ({allMembers.length})
              </span>
            </button>
          )}
        </Card>
      )}
    </div>
  );
}
