'use client';

import { useMemo } from 'react';
import { useApp } from '@/store/AppContext';
import { useMyTeam, useIndustryColor } from '@/store/selectors';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { getToday, formatHumanDate } from '@/utils/date';
import { getCurrentWeekDays, getDayLabel } from '@/utils/checkin-helpers';

export default function SubAdminCheckInsScreen() {
  const { state } = useApp();
  const team = useMyTeam();
  const color = useIndustryColor();
  const today = getToday();

  const memberIds = useMemo(
    () => (team ? [team.lead.id, ...team.members.map((m) => m.id)] : []),
    [team]
  );

  const teamCheckIns = useMemo(
    () =>
      state.checkIns
        .filter((c) => memberIds.includes(c.userId))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [state.checkIns, memberIds]
  );

  const todayCount = teamCheckIns.filter((c) => c.date === today && c.status === 'Checked-In').length;

  const getName = (userId: string) => {
    if (!team) return userId;
    if (team.lead.id === userId) return team.lead.name;
    const m = team.members.find((e) => e.id === userId);
    return m?.name || userId;
  };

  const weekDays = getCurrentWeekDays(today);
  const weeklyStats = useMemo(() => {
    return weekDays.map((day) => {
      const isFuture = day > today;
      const dow = new Date(`${day}T12:00:00`).getDay();
      const isWeekend = dow === 0 || dow === 6;
      const checkedCount = isFuture || isWeekend
        ? 0
        : teamCheckIns.filter((c) => c.date === day && c.status === 'Checked-In').length;
      return { date: day, checkedCount, isFuture, isWeekend };
    });
  }, [weekDays, teamCheckIns, today]);

  return (
    <div className="flex-1 bg-surface-50 dark:bg-surface-950 min-h-screen">
      <div className="px-5 pt-4">
        {/* Summary */}
        <Card className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-title" style={{ color: todayCount > 0 ? color : '#dc2626' }}>{todayCount}</p>
              <p className="text-caption text-surface-400 dark:text-surface-500">Checked in today</p>
            </div>
            <div>
              <p className="text-title text-surface-900 dark:text-surface-100">{memberIds.length}</p>
              <p className="text-caption text-surface-400 dark:text-surface-500">Team members</p>
            </div>
          </div>
        </Card>

        {/* Team 7-Day Strip */}
        <p className="text-caption text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2">
          This Week
        </p>
        <Card className="mb-4">
          <div className="flex justify-between">
            {weeklyStats.map((ws) => (
              <div key={ws.date} className="flex flex-col items-center flex-1">
                <span className={`text-caption mb-1 ${ws.date === today ? 'font-bold text-surface-900 dark:text-surface-100' : 'text-surface-400 dark:text-surface-500'}`}>
                  {getDayLabel(ws.date)}
                </span>
                <div
                  className={`h-9 w-9 rounded-full flex items-center justify-center ${ws.date === today ? 'border-2' : ''}`}
                  style={ws.date === today ? { borderColor: color } : undefined}
                >
                  {ws.isFuture || ws.isWeekend ? (
                    <div className="h-2 w-2 rounded-full bg-surface-200 dark:bg-surface-700" />
                  ) : (
                    <span
                      className="text-body font-bold"
                      style={{ color: ws.checkedCount === memberIds.length ? '#059669' : ws.checkedCount > 0 ? '#d97706' : '#dc2626' }}
                    >
                      {ws.checkedCount}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <p className="text-caption text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-3">
          Recent Check-ins
        </p>
      </div>

      <div className="px-5 pb-24 space-y-2">
        {teamCheckIns.length === 0 && (
          <EmptyState icon="notifications-outline" title="No check-ins yet" />
        )}
        {teamCheckIns.map((item, i) => (
          <Card key={`${item.userId}-${item.date}-${i}`} className="flex items-center gap-3">
            <Avatar name={getName(item.userId)} color={item.status === 'Checked-In' ? color : '#9ca3af'} size="sm" />
            <div className="flex-1">
              <p className="text-body font-medium text-surface-900 dark:text-surface-100">{getName(item.userId)}</p>
              <p className="text-caption text-surface-400 dark:text-surface-500">
                {formatHumanDate(item.date) || item.date} · {item.status === 'Checked-In' ? `${item.checkedInAt} · ${item.summary}` : 'Missed'}
              </p>
            </div>
            <span style={{ color: item.status === 'Checked-In' ? '#059669' : '#dc2626' }}>
              {item.status === 'Checked-In' ? '\u2714' : '\u2718'}
            </span>
          </Card>
        ))}
      </div>
    </div>
  );
}
