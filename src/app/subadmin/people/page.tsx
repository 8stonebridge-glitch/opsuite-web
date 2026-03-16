'use client';

import { useMemo } from 'react';
import { useApp } from '@/store/AppContext';
import { useMyTeam, useIndustryColor, useAllEmployeePerformances, useAvailability } from '@/store/selectors';
import { isStalledTask } from '@/utils/task-helpers';
import { getToday } from '@/utils/date';
import { getActiveAvailability } from '@/utils/availability-helpers';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScoreBadge } from '@/components/performance/ScoreBadge';

export default function SubAdminPeopleScreen() {
  const { state } = useApp();
  const team = useMyTeam();
  const color = useIndustryColor();
  const allPerfs = useAllEmployeePerformances();
  const availability = useAvailability();
  const today = getToday();

  const memberStats = useMemo(() => {
    if (!team) return new Map<string, { stalledCount: number; handoffToday: boolean }>();
    const threshold = state.orgSettings.noChangeAlertWorkdays;
    const map = new Map<string, { stalledCount: number; handoffToday: boolean }>();
    for (const m of [...team.members, team.lead]) {
      const memberTasks = state.tasks.filter((t) => t.assigneeId === m.id);
      const stalledCount = memberTasks.filter((t) => isStalledTask(t, state.audit, threshold)).length;
      const handoffToday = state.handoffs.some((h) => h.userId === m.id && h.date === today);
      map.set(m.id, { stalledCount, handoffToday });
    }
    return map;
  }, [team, state.tasks, state.audit, state.handoffs, state.orgSettings.noChangeAlertWorkdays, today]);

  if (!team) {
    return (
      <div className="flex-1 bg-surface-50 dark:bg-surface-950 min-h-screen">
        <EmptyState icon="people-outline" title="No team found" />
      </div>
    );
  }

  const allMembers = [team.lead, ...team.members];

  return (
    <div className="flex-1 bg-surface-50 dark:bg-surface-950 min-h-screen">
      <div className="px-5 pt-4">
        <p className="text-caption text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-3">
          {team.name} Team · {team.members.length} {team.members.length === 1 ? 'member' : 'members'}
        </p>
      </div>
      <div className="px-5 pb-24 space-y-2">
        {allMembers.map((member, index) => {
          const perf = allPerfs.get(member.id);
          const topAction = perf?.actions[0];
          const stats = memberStats.get(member.id);
          const activeAvail = getActiveAvailability(member.id, today, availability);
          return (
            <Card key={member.id} className="flex items-center gap-3">
              <Avatar name={member.name} color={index === 0 ? team.color : '#6b7280'} size="sm" />
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-body font-medium text-surface-900 dark:text-surface-100">{member.name}</span>
                  {stats?.handoffToday && (
                    <span className="text-emerald-600 text-caption">&#x2714;</span>
                  )}
                  {activeAvail && (
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
                      style={{
                        backgroundColor:
                          (activeAvail.type === 'sick' ? '#ef4444' : activeAvail.type === 'leave' ? '#3b82f6' : '#6366f1') + '15',
                        color: activeAvail.type === 'sick' ? '#ef4444' : activeAvail.type === 'leave' ? '#3b82f6' : '#6366f1',
                      }}
                    >
                      {activeAvail.type === 'sick' ? 'Sick' : activeAvail.type === 'leave' ? 'On leave' : 'Off duty'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-caption text-surface-400 dark:text-surface-500">
                    {index === 0 ? 'Team Lead' : 'Member'}
                    {topAction ? ` · ${topAction.label}` : ''}
                  </span>
                  {stats && stats.stalledCount > 0 && (
                    <span className="text-[10px] text-amber-600 font-medium">
                      {stats.stalledCount} stalled
                    </span>
                  )}
                </div>
              </div>
              {perf && <ScoreBadge score={perf.score} band={perf.band} size="sm" />}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
