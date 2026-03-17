'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Calendar, Smile } from 'lucide-react';
import { getCheckInForDate, formatCheckInDate } from '@/utils/checkin-helpers';
import type { CheckIn } from '@/types';

export function StatTab({
  label,
  value,
  active,
  activeColor,
  onPress,
}: {
  label: string;
  value: string | number;
  active: boolean;
  activeColor: string;
  onPress: () => void;
}) {
  return (
    <button
      onClick={onPress}
      className={`flex-1 min-w-[70px] px-3 sm:px-4 py-2.5 rounded-card ${active ? '' : 'bg-surface-100 dark:bg-surface-800'}`}
      style={active ? { backgroundColor: activeColor } : undefined}
    >
      <span className={`text-caption font-medium block ${active ? 'text-white' : 'text-surface-500 dark:text-surface-400'}`}>{label}</span>
      <span className={`text-title block ${active ? 'text-white' : 'text-surface-900 dark:text-surface-100'}`}>{value}</span>
    </button>
  );
}

export function DayDetail({ date, checkIn }: { date: string; checkIn?: CheckIn }) {
  return (
    <div>
      <p className="text-body font-medium text-surface-900 dark:text-surface-100 mb-1">{formatCheckInDate(date)}</p>
      {checkIn?.status === 'Checked-In' ? (
        <div className="space-y-1">
          <p className="text-caption text-surface-600 dark:text-surface-400">Checked in at {checkIn.checkedInAt}</p>
          {checkIn.type && <p className="text-caption text-surface-600 dark:text-surface-400">{checkIn.type}</p>}
          {checkIn.summary && <p className="text-caption text-surface-500 dark:text-surface-500">{checkIn.summary}</p>}
        </div>
      ) : (
        <p className="text-caption text-red-500">Missed</p>
      )}
    </div>
  );
}

export function CheckInList({
  days,
  checkIns,
  userId,
  emptyMessage,
  color,
  isMissed,
}: {
  days: string[];
  checkIns: CheckIn[];
  userId: string;
  emptyMessage: string;
  color: string;
  isMissed?: boolean;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (days.length === 0) {
    return (
      <div className="py-8 flex flex-col items-center">
        <span className="text-surface-300 dark:text-surface-600">{isMissed ? <Smile className="size-8" /> : <Calendar className="size-8" />}</span>
        <p className="text-surface-400 dark:text-surface-500 text-body mt-2">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {days.map((day) => {
        const ci = getCheckInForDate(checkIns, userId, day);
        const isExpanded = expanded === day;

        return (
          <button key={day} onClick={() => setExpanded(isExpanded ? null : day)} className="w-full text-left">
            <Card>
              <div className="flex items-center gap-3">
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: isMissed ? '#fef2f2' : '#f0fdf4' }}
                >
                  <span className={isMissed ? 'text-red-600' : 'text-emerald-600'}>
                    {isMissed ? '\u2718' : '\u2714'}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-body font-medium text-surface-900 dark:text-surface-100">{formatCheckInDate(day)}</p>
                  {!isMissed && ci?.checkedInAt && (
                    <p className="text-caption text-surface-400 dark:text-surface-500">{ci.checkedInAt} · {ci.summary || ''}</p>
                  )}
                </div>
                <span className="text-surface-400 text-caption">{isExpanded ? '\u25B2' : '\u25BC'}</span>
              </div>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-surface-100 dark:border-surface-800">
                  <DayDetail date={day} checkIn={ci} />
                </div>
              )}
            </Card>
          </button>
        );
      })}
    </div>
  );
}

export function RateView({
  stats,
  color,
}: {
  stats: { checked: number; missed: number; percentage: number };
  color: string;
}) {
  const total = stats.checked + stats.missed;

  return (
    <Card>
      <div className="flex flex-col items-center py-4">
        <span className="text-5xl font-bold" style={{ color }}>{stats.percentage}%</span>
        <p className="text-body text-surface-400 dark:text-surface-500 mt-1">Attendance Rate</p>

        <div className="w-full h-3 bg-surface-100 dark:bg-surface-800 rounded-full mt-4 overflow-hidden">
          <div className="h-3 rounded-full" style={{ width: `${stats.percentage}%`, backgroundColor: color }} />
        </div>

        <div className="flex justify-between w-full mt-3">
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-caption text-surface-500 dark:text-surface-400">{stats.checked} checked</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 rounded-full bg-surface-300 dark:bg-surface-600" />
            <span className="text-caption text-surface-500 dark:text-surface-400">{stats.missed} missed</span>
          </div>
          <span className="text-caption text-surface-400 dark:text-surface-500">{total} workdays</span>
        </div>
      </div>
    </Card>
  );
}

export function StreaksView({
  stats,
  color,
}: {
  stats: { currentStreak: number; longestStreak: number };
  color: string;
}) {
  return (
    <div className="space-y-3">
      <Card>
        <div className="flex flex-col items-center py-5">
          <div className="h-16 w-16 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: '#fef3c7' }}>
            <span className="text-3xl">🔥</span>
          </div>
          <span className="text-4xl font-bold text-surface-900 dark:text-surface-100">{stats.currentStreak}</span>
          <p className="text-body text-surface-400 dark:text-surface-500 mt-1">Current Streak</p>
          <p className="text-caption text-surface-300 dark:text-surface-600 mt-0.5">consecutive workdays</p>
        </div>
      </Card>

      <Card className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-full flex items-center justify-center bg-amber-50 dark:bg-amber-950">
          <span className="text-xl">🏆</span>
        </div>
        <div className="flex-1">
          <p className="text-body font-medium text-surface-900 dark:text-surface-100">Best Streak</p>
          <p className="text-caption text-surface-400 dark:text-surface-500">Your longest run</p>
        </div>
        <span className="text-title text-surface-900 dark:text-surface-100">{stats.longestStreak}</span>
      </Card>

      {stats.currentStreak >= 5 && (
        <Card className="flex items-center justify-center py-3" style={{ backgroundColor: '#fefce8' }}>
          <span className="text-caption font-semibold text-amber-700">
            {stats.currentStreak >= 20
              ? 'Legendary! Keep going!'
              : stats.currentStreak >= 10
                ? 'On fire! Amazing consistency!'
                : 'Great start! Keep the momentum!'}
          </span>
        </Card>
      )}
    </div>
  );
}
