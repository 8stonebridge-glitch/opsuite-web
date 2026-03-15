'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../../../../src/store/AppContext';
import {
  useIndustryColor,
  useCurrentName,
  useMyCheckIns,
  useCheckInStats,
  useScopedTasks,
} from '../../../../src/store/selectors';
import { RoleSwitcher } from '../../../../src/components/layout/RoleSwitcher';
import { Card } from '../../../../src/components/ui/Card';
import { Calendar, Smile } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getToday, getNowISO } from '../../../../src/utils/date';
import {
  getCurrentWeekDays,
  getDayLabel,
  getCheckInForDate,
  formatCheckInDate,
  formatMonthLabel,
  getMonthDays,
} from '../../../../src/utils/checkin-helpers';
import type { CheckIn } from '../../../../src/types';

type StatsTab = 'checked' | 'missed' | 'rate' | 'streaks';

export default function EmployeeCheckInScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const color = useIndustryColor();
  const curName = useCurrentName();
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
    const nowTime = new Date();
    const time = `${String(nowTime.getHours()).padStart(2, '0')}:${String(nowTime.getMinutes()).padStart(2, '0')}`;
    const type = openTasks.length > 0 ? 'Tasks Logged' : 'No Tasks';
    const summary = openTasks.length > 0
      ? `${openTasks.length} open tasks reviewed`
      : 'No active tasks';

    dispatch({
      type: 'ADD_CHECKIN',
      checkIn: {
        userId: state.userId!,
        date: today,
        status: 'Checked-In',
        type,
        checkedInAt: time,
        summary,
      },
    });

    dispatch({
      type: 'ADD_AUDIT',
      entry: {
        taskId: null,
        role: 'System',
        message: `Daily check-in by ${curName}. ${summary}.`,
        createdAt: getNowISO(),
        dateTag: today,
        updateType: 'Check-in',
      },
    });
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
    <div className="flex-1 bg-gray-50 dark:bg-gray-950 min-h-screen">
      <RoleSwitcher />

      <div className="overflow-y-auto pb-24">
        {/* Check-in CTA */}
        <div className="px-5 pt-4">
          {!todayCheckIn ? (
            <Card className="mb-4">
              <div className="flex flex-col items-center py-4">
                <div className="h-16 w-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${color}18` }}>
                  <span className="text-3xl" style={{ color }}>&#x2714;</span>
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Daily Handoff</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mb-4 text-center">
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
                <p className="text-base font-bold text-gray-900 dark:text-gray-100 mt-1">Checked In</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Today at {todayCheckIn.checkedInAt} · {todayCheckIn.summary}
                </p>
              </div>
            </Card>
          )}
        </div>

        {/* 7-Day Strip */}
        <div className="px-5 mb-4">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
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
                    <span className={`text-xs mb-1 ${isToday ? 'font-bold text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>
                      {getDayLabel(day)}
                    </span>
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center ${isToday ? 'border-2' : ''}`}
                      style={isToday ? { borderColor: color } : undefined}
                    >
                      {isFuture || isWeekend ? (
                        <div className="h-2 w-2 rounded-full bg-gray-200 dark:bg-gray-700" />
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
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
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
            <button onClick={prevMonth} className="p-2 text-gray-500">
              &larr;
            </button>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {formatMonthLabel(viewYear, viewMonth)}
            </span>
            <button onClick={nextMonth} className="p-2 text-gray-500" style={isCurrentMonth ? { opacity: 0.3 } : undefined}>
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
      className={`px-4 py-2.5 rounded-2xl ${active ? '' : 'bg-gray-100 dark:bg-gray-800'}`}
      style={active ? { backgroundColor: activeColor } : undefined}
    >
      <span className={`text-xs font-medium block ${active ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>{label}</span>
      <span className={`text-lg font-bold block ${active ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>{value}</span>
    </button>
  );
}

function DayDetail({ date, checkIn }: { date: string; checkIn?: CheckIn }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">{formatCheckInDate(date)}</p>
      {checkIn?.status === 'Checked-In' ? (
        <div className="space-y-1">
          <p className="text-xs text-gray-600 dark:text-gray-400">Checked in at {checkIn.checkedInAt}</p>
          {checkIn.type && <p className="text-xs text-gray-600 dark:text-gray-400">{checkIn.type}</p>}
          {checkIn.summary && <p className="text-xs text-gray-500 dark:text-gray-500">{checkIn.summary}</p>}
        </div>
      ) : (
        <p className="text-xs text-red-500">Missed</p>
      )}
    </div>
  );
}

function CheckInList({ days, checkIns, userId, emptyMessage, color, isMissed }: { days: string[]; checkIns: CheckIn[]; userId: string; emptyMessage: string; color: string; isMissed?: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (days.length === 0) {
    return (
      <div className="py-8 flex flex-col items-center">
        <span className="text-gray-300 dark:text-gray-600">{isMissed ? <Smile className="size-8" /> : <Calendar className="size-8" />}</span>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">{emptyMessage}</p>
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
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatCheckInDate(day)}</p>
                  {!isMissed && ci?.checkedInAt && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">{ci.checkedInAt} · {ci.summary || ''}</p>
                  )}
                </div>
                <span className="text-gray-400 text-xs">{isExpanded ? '\u25B2' : '\u25BC'}</span>
              </div>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
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
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Attendance Rate</p>

        <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full mt-4 overflow-hidden">
          <div className="h-3 rounded-full" style={{ width: `${stats.percentage}%`, backgroundColor: color }} />
        </div>

        <div className="flex justify-between w-full mt-3">
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs text-gray-500 dark:text-gray-400">{stats.checked} checked</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-gray-600" />
            <span className="text-xs text-gray-500 dark:text-gray-400">{stats.missed} missed</span>
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500">{total} workdays</span>
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
          <span className="text-4xl font-bold text-gray-900 dark:text-gray-100">{stats.currentStreak}</span>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Current Streak</p>
          <p className="text-xs text-gray-300 dark:text-gray-600 mt-0.5">consecutive workdays</p>
        </div>
      </Card>

      <Card className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-full flex items-center justify-center bg-amber-50 dark:bg-amber-950">
          <span className="text-xl">🏆</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Best Streak</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Your longest run</p>
        </div>
        <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.longestStreak}</span>
      </Card>

      {stats.currentStreak >= 5 && (
        <Card className="flex items-center justify-center py-3" style={{ backgroundColor: '#fefce8' }}>
          <span className="text-sm font-semibold text-amber-700">
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
