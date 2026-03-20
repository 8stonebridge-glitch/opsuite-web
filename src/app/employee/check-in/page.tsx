'use client';

import { useState, useMemo } from 'react';
import { useHydrated } from '@/hooks/useHydrated';
import { useRouter } from 'next/navigation';
import { useApp } from '@/store/AppContext';
import {
  useIndustryColor,
  useCheckInStats,
  useScopedTasks,
} from '@/store/selectors';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatTab, DayDetail, CheckInList, RateView, StreaksView } from '@/components/check-in/CheckInPanels';
import { getToday } from '@/utils/date';
import {
  getCurrentWeekDays,
  getDayLabel,
  getCheckInForDate,
  formatMonthLabel,
  getMonthDays,
} from '@/utils/checkin-helpers';

type StatsTab = 'checked' | 'missed' | 'rate' | 'streaks';

export default function EmployeeCheckInScreen() {
  const { state } = useApp();
  const router = useRouter();
  const color = useIndustryColor();
  const myTasks = useScopedTasks();
  const today = getToday();

  // useHydrated gates date-dependent rendering without setState-in-effect
  const hydrated = useHydrated();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const [viewYear, setViewYear] = useState(currentYear);
  const [viewMonth, setViewMonth] = useState(currentMonth);
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
    const isCurrentMonth = viewYear === currentYear && viewMonth === currentMonth;
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

  const isCurrentMonth = viewYear === currentYear && viewMonth === currentMonth;

  // Wait for client hydration before rendering date-dependent UI
  if (!hydrated) {
    return (
      <div className="flex-1 bg-surface-50 dark:bg-surface-950 min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-surface-200 border-t-emerald-600" />
      </div>
    );
  }

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

