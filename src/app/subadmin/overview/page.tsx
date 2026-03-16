'use client';

import { useMemo } from 'react';
import { useApp } from '@/store/AppContext';
import {
  useBucketedTasks,
  useActiveGroups,
  useCheckInHealth,
  useTeamMemberIds,
  useIndustryColor,
  useMyTeam,
  useSubadminPerformance,
  useNeedsDelegation,
  useTeams,
  usePendingRequests,
  useAwayToday,
  useCoverageNeeded,
} from '@/store/selectors';
import { KpiRow } from '@/components/overview/KpiRow';
import { Card } from '@/components/ui/Card';
import { ScoreBadge, BandLabel } from '@/components/performance/ScoreBadge';
import { AtRiskSection } from '@/components/performance/AtRiskSection';
import { AvailabilityRequestCard } from '@/components/availability/AvailabilityRequestCard';
import { Avatar } from '@/components/ui/Avatar';
import { computeEmployeePerformance } from '@/utils/performance';

export default function SubAdminOverviewScreen() {
  const { state } = useApp();
  const color = useIndustryColor();
  const teams = useTeams();
  const team = useMyTeam();
  const memberIds = useTeamMemberIds();
  const { active, review } = useBucketedTasks();
  const { overdue, stalled } = useActiveGroups();
  const checkInHealth = useCheckInHealth(memberIds);
  const teamPerf = useSubadminPerformance(team?.id || '');
  const needsDelegation = useNeedsDelegation();
  const pendingRequests = usePendingRequests();
  const awayToday = useAwayToday();
  const coverageNeeded = useCoverageNeeded();

  const atRiskPerfs = useMemo(() => {
    if (!team) return [];
    return team.members
      .map((m) => computeEmployeePerformance(m.id, state.tasks, state.checkIns, teams, state.availability))
      .filter((p) => p.band !== 'green')
      .sort((a, b) => a.score - b.score);
  }, [team, state.tasks, state.checkIns, teams, state.availability]);

  const teamTaskIds = new Set(
    state.tasks.filter((t) => memberIds.includes(t.assigneeId)).map((t) => t.id)
  );

  return (
    <div className="flex-1 bg-surface-50 dark:bg-surface-950 min-h-screen">
      <div className="overflow-y-auto pb-24">
        <div className="px-5 pt-4 space-y-5">
          <KpiRow
            items={[
              { label: 'Active', value: active.length, color },
              { label: 'Review', value: review.length, color: '#d97706' },
              { label: 'Overdue', value: overdue.length, color: '#dc2626' },
              { label: 'Stalled', value: stalled.length, color: '#ea580c' },
              ...(awayToday.length > 0 ? [{ label: 'Away', value: awayToday.length, color: '#6366f1' }] : []),
            ]}
          />

          {pendingRequests.length > 0 && (
            <div>
              <p className="text-caption text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-3">
                Pending Requests ({pendingRequests.length})
              </p>
              <div className="space-y-2">
                {pendingRequests.map((r) => (
                  <AvailabilityRequestCard key={r.id} record={r} approverId={state.userId || ''} />
                ))}
              </div>
            </div>
          )}

          {awayToday.length > 0 && (
            <div>
              <p className="text-caption text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-3">
                Away Today ({awayToday.length})
              </p>
              <Card>
                {awayToday.map((emp, i) => (
                  <div
                    key={emp.id}
                    className={`flex items-center gap-3 py-2.5 ${i < awayToday.length - 1 ? 'border-b border-surface-50 dark:border-surface-800' : ''}`}
                  >
                    <Avatar name={emp.name} color={team?.color || '#6366f1'} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-medium text-surface-900 dark:text-surface-100 truncate">{emp.name}</p>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          )}

          {coverageNeeded.length > 0 && (
            <div>
              <p className="text-caption text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-3">
                Coverage Needed ({coverageNeeded.length})
              </p>
              <Card>
                {coverageNeeded.slice(0, 5).map((task, i) => (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 py-2.5 ${i < Math.min(coverageNeeded.length, 5) - 1 ? 'border-b border-surface-50 dark:border-surface-800' : ''}`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-body text-surface-900 dark:text-surface-100 truncate">{task.title}</p>
                      <p className="text-caption text-surface-400 dark:text-surface-500">{task.site} · {task.assignee}</p>
                    </div>
                    <div className="px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950">
                      <span className="text-[10px] font-semibold text-orange-600 dark:text-orange-400">Coverage</span>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          )}

          {needsDelegation.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-body text-indigo-500">&#x21AA;</span>
                <p className="text-caption text-surface-400 dark:text-surface-500 uppercase tracking-wider">
                  Needs Delegation
                </p>
              </div>
              <p className="text-title text-surface-900 dark:text-surface-100">
                {needsDelegation.length}
              </p>
              <p className="text-caption text-surface-400 dark:text-surface-500 mt-1">
                {needsDelegation.length === 1 ? 'task' : 'tasks'} assigned to you — delegate to a team member
              </p>
            </Card>
          )}

          <Card>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-body text-emerald-600">🤚</span>
              <p className="text-caption text-surface-400 dark:text-surface-500 uppercase tracking-wider">
                Handoffs Today
              </p>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-display text-surface-900 dark:text-surface-100">
                {checkInHealth.checkedInToday}
              </span>
              <span className="text-body text-surface-400 dark:text-surface-500 mb-1">
                / {checkInHealth.total}
              </span>
              <div className="flex-1" />
              <span
                className="text-title mb-0.5"
                style={{ color: checkInHealth.rate >= 80 ? '#059669' : checkInHealth.rate >= 50 ? '#d97706' : '#dc2626' }}
              >
                {checkInHealth.rate}%
              </span>
            </div>
            <div className="h-2 bg-surface-100 dark:bg-surface-800 rounded-full mt-3 overflow-hidden">
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${checkInHealth.rate}%`,
                  backgroundColor: checkInHealth.rate >= 80 ? '#059669' : checkInHealth.rate >= 50 ? '#d97706' : '#dc2626',
                }}
              />
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <ScoreBadge score={teamPerf.score} band={teamPerf.band} trendDelta={teamPerf.trendDelta} size="md" />
              <div className="flex-1">
                <p className="text-caption text-surface-900 dark:text-surface-100">Team Performance</p>
                <div className="flex items-center gap-2 mt-1">
                  <BandLabel band={teamPerf.band} />
                  {teamPerf.atRiskCount > 0 && (
                    <span className="text-[10px] text-amber-500 font-medium">
                      {teamPerf.atRiskCount} at risk
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <AtRiskSection employees={atRiskPerfs} limit={5} />
        </div>
      </div>
    </div>
  );
}
