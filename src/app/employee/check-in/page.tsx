'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/store/AppContext';
import {
  useIndustryColor,
  useMyCheckIns,
  useCheckInStats,
  useScopedTasks,
} from '@/store/selectors';
import { Card } from '@/components/ui/Card';
import { Calendar, Smile } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getToday } from '@/utils/date';
import {
  getCurrentWeekDays,
  getDayLabel,
  getCheckInForDate,
  formatCheckInDate,
  formatMonthLabel,
  getMonthDays,
} from '@/utils/checkin-helpers';
import type { CheckIn } from '@/types';

type StatsTab = 'checked' | 'missed' | 'rate' | 'streaks';

export default function EmployeeCheckInScreen() {
  const { state } = useApp();
  const router = useRouter();
  const color = useIndustryColor();
  const myCheckIns = useMyCheckIns();
  const myTasks = useScopedTasks();
  const today = getToday();

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const stats = useCheckInStats(viewYear, viewMonth);

  const [activeTab, setActiveTab] = useState<StatsTab>('checked');
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const todayCheckIn = useMemo(
    () => state.checkIns.find((c) => c.userId === state.userId && c.date === today),
    [state.checkIns, state.userId, today]
  );

  const weekDays = getCurrentWeekDays(today);

  const openTasks = myTasks.filter((t) => t.status === 'Open' || t.status === 'In Progress');

  const handleCheckIn = async () => {
    try {
      const res = await fetch('/api/handoffs/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error('[handleCheckIn]', data.error || 'Failed');
      }
    } catch (err) {
      console.error('[handleCheckIn]', err);
    }
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();
    if (isCurrentMonth) return;
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const monthDays = useMemo(() => {
    return getMonthDays(viewYear, viewMonth)
      .filter((d) => d <= today)
      .reverse();
  }, [viewYear, viewMonth, today]);

  const checkedDays = useMemo(
    () => monthDays.filter((d) => getCheckInForDate(state.checkIns, state.userId || '', d)?.status === 'Checked-In'),
    [monthDays, state.checkIns, state.userId]
  );

  const missedDays = useMemo(
    () => monthDays.filter((d) => !getCheckInForDate(state.checkIns, state.userId || '', d) || getCheckInForDate(state.checkIns, state.userId || '', d)?.status === 'Missed'),
    [monthDays, state.checkIns, state.userId]
  );

  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  return (
    <div className="flex-1 bg-surface-50 dark:bg-surface-950 min-h-screen">
      <div className="overflow-y-auto pb-24">
        {/* Check-in CTA */}
        <div className="px-5 pt-4">
          {!todayCheckIn ? (
            <Card className="mb-4">
              <div className="flex flex-col items-center py-4">
                <div className="h-16 w-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${color}18` }}>
                  <span className="text-3xl" style={{ color }}>&#x2714;</span>
                </div>
                <p className="text-title text-surface-900 dark:text-surface-100 mb-1">Daily Handoff</p>
                <p className="text-body text-surface-400 dark:text-surface-500 mb-4 text-center">
                  {openTasks.length > 0
                    ? `You have ${openTasks.length} open task${openTasks.length > 1 ? 's' : ''}`
                    : 'No active tasks today'}
                </p>
                <Button
                  onClick={() => void handleCheckIn()}
                  style={{ backgroundColor: color }}
                  className="w-full"
                >Check In Now</Button>
              </div>
            </Card>
          ) : (
            <Card className="mb-4">
              <div className="flex flex-col items-center py-3">
                <span className="text-4xl" style={{ color }}>&#x2714;</span>
                <p className="text-heading text-surface-900 dark:text-surface-100 mt-1">Checked In</p>
                <p className="text-caption text-surface-400 dark:text-surface-500 mt-0.5">
                  Today at {todayCheckIn.checkedInAt} · {todayCheckIn.summary}
                </p>
              </div>
            </Card>
          )}
        </div>

        {/* 7-Day Strip */}
        <div className="px-5 mb-4">
          <p className="text-micro font-semibold text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2">
            This Week
          </p>
          <Card>
            <div className="flex justify-between">
              {weekDays.map((day) => {
                const ci = getCheckInForDate(state.checkIns, state.userId || '', day);
                const isFuture = day > today;
                const isToday = day === today;
                const checked = ci?.status === 'Checked-In';
                const dow = new Date(`${day}T12:00:00`).getDay();
                const isWeekend = dow === 0 || dow === 6;

                return (
                  <button
                    key={day}
                    onClick={() => !isFuture && setExpandedDate(expandedDate === day ? null : day)}
                    className="flex flex-col items-center flex-1"
                  >
                    <span className={`text-caption mb-1 ${isToday ? 'font-bold text-surface-900 dark:text-surface-100' : 'text-surface-400 dark:text-surface-500'}`}>
                      {getDayLabel(day)}
                    </span>
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center ${isToday ? 'border-2' : ''}`}
                      style={isToday ? { borderColor: color } : undefined}
                    >
                      {isFuture || isWeekend ? (
                        <div className="h-2 w-2 rounded-full bg-surface-200 dark:bg-surface-700" />
                      ) : checked ? (
                        <span className="text-lg text-emerald-600">&#x2714;</span>
                      ) : (
                        <span className="text-lg text-red-600">&#x2718;</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {expandedDate && (
              <div className="mt-3 pt-3 border-t border-surface-100 dark:border-surface-800">
                <DayDetail
                  date={expandedDate}
                  checkIn={getCheckInForDate(state.checkIns, state.userId || '', expandedDate)}
                />
              </div>
            )}
          </Card>
        </div>

        {/* Month Navigation */}
        <div className="px-5 mb-3">
          <div className="flex items-center justify-between">
            <button onClick={prevMonth} className="p-2 text-surface-500">
              &larr;
            </button>
            <span className="text-caption font-semibold text-surface-700 dark:text-surface-300">
              {formatMonthLabel(viewYear, viewMonth)}
            </span>
            <button onClick={nextMonth} className="p-2 text-surface-500" style={isCurrentMonth ? { opacity: 0.3 } : undefined}>
              &rarr;
            </button>
          </div>
        </div>

        {/* Stats Tabs */}
        <div className="px-5 mb-4">
          <div className="flex gap-2 overflow-x-auto">
            <StatTab label="Checked" value={stats.checked} active={activeTab === 'checked'} activeColor="#059669" onPress={() => setActiveTab('checked')} />
            <StatTab label="Missed" value={stats.missed} active={activeTab === 'missed'} activeColor="#dc2626" onPress={() => setActiveTab('missed')} />
            <StatTab label="Rate" value={`${stats.percentage}%`} active={activeTab === 'rate'} activeColor="#3b82f6" onPress={() => setActiveTab('rate')} />
            <StatTab label="Streaks" value={stats.currentStreak} active={activeTab === 'streaks'} activeColor="#f59e0b" onPress={() => setActiveTab('streaks')} />
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-5">
          {activeTab === 'checked' && (
            <CheckInList
              days={checkedDays}
              checkIns={state.checkIns}
              userId={state.userId || ''}
              emptyMessage="No check-ins this month"
              color={color}
            />
          )}
          {activeTab === 'missed' && (
            <CheckInList
              days={missedDays}
              checkIns={state.checkIns}
              userId={state.userId || ''}
              emptyMessage="No missed days this month"
              color="#dc2626"
              isMissed
            />
          )}
          {activeTab === 'rate' && (
            <RateView stats={stats} color={color} />
          )}
          {activeTab === 'streaks' && (
            <StreaksView stats={stats} color={color} />
          )}
        </div>
      </div>
    </div>
  );
}

function StatTab({ label, value, active, activeColor, onPress }: { label: string; value: string | number; active: boolean; activeColor: string; onPress: () => void }) {
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

function DayDetail({ date, checkIn }: { date: string; checkIn?: CheckIn }) {
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

function CheckInList({ days, checkIns, userId, emptyMessage, color, isMissed }: { days: string[]; checkIns: CheckIn[]; userId: string; emptyMessage: string; color: string; isMissed?: boolean }) {
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

function RateView({ stats, color }: { stats: { checked: number; missed: number; percentage: number }; color: string }) {
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

function StreaksView({ stats, color }: { stats: { currentStreak: number; longestStreak: number }; color: string }) {
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
