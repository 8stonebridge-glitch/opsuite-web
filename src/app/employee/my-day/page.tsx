'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../../../../src/store/AppContext';
import {
  useMyDayData,
  useMyPerformance,
  useIndustryColor,
  useCurrentName,
  useHandoffProgress,
  useHasCompletedHandoffToday,
  useIsProtectedUnavailableToday,
} from '../../../../src/store/selectors';
import { getToday, getNowISO } from '../../../../src/utils/date';
import { buildHandoffSummary } from '../../../../src/utils/handoff-helpers';
import { TaskPreviewSection } from '../../../../src/components/overview/TaskPreviewSection';
import { PerformanceCard } from '../../../../src/components/performance/PerformanceCard';
import { Card } from '../../../../src/components/ui/Card';
import { useTheme } from '../../../../src/providers/ThemeProvider';

export default function EmployeeMyDayScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const { isDark } = useTheme();
  const color = useIndustryColor();
  const name = useCurrentName();
  const myPerf = useMyPerformance();
  const isUnavailable = useIsProtectedUnavailableToday();

  const today = getToday();
  const [isSubmittingHandoff, setIsSubmittingHandoff] = useState(false);
  const [isSubmittingNoChangeId, setIsSubmittingNoChangeId] = useState<string | null>(null);

  const { dueToday, overdue, inProgress } = useMyDayData();
  const handoff = useHandoffProgress();
  const handoffDone = useHasCompletedHandoffToday();

  const handleNoChange = async (taskId: string) => {
    dispatch({
      type: 'ADD_AUDIT',
      entry: {
        taskId,
        role: 'Employee',
        message: `No change reported by ${name}.`,
        createdAt: getNowISO(),
        dateTag: today,
        updateType: 'No Change',
      },
    });
    dispatch({
      type: 'UPDATE_TASK',
      taskId,
      updates: { lastNoChangeAt: today },
    });
  };

  const handleCompleteHandoff = async () => {
    const summary = buildHandoffSummary(state.tasks, state.userId || '', state.audit);
    dispatch({ type: 'ADD_HANDOFF', handoff: summary });

    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    dispatch({
      type: 'ADD_CHECKIN',
      checkIn: {
        userId: state.userId || '',
        date: today,
        status: 'Checked-In',
        type: summary.type === 'tasks_reviewed' ? 'Tasks Reviewed' : 'No Tasks',
        checkedInAt: time,
        summary:
          summary.type === 'tasks_reviewed'
            ? `${summary.tasksSummary.length} tasks reviewed`
            : 'No active tasks',
      },
    });

    dispatch({
      type: 'ADD_AUDIT',
      entry: {
        taskId: null,
        role: 'System',
        message:
          summary.type === 'tasks_reviewed'
            ? `Daily handoff by ${name}. ${summary.tasksSummary.length} tasks reviewed.`
            : `Daily handoff by ${name}. No active tasks.`,
        createdAt: getNowISO(),
        dateTag: today,
        updateType: summary.type === 'tasks_reviewed' ? 'Daily Handoff' : 'No Tasks Today',
      },
    });
  };

  const handleNoTasksHandoff = async () => {
    await handleCompleteHandoff();
  };

  const goToTask = (id: string) => {
    router.push(`/employee/tasks/${id}`);
  };

  const goToTasks = () => {
    router.push('/employee/tasks');
  };

  const isEmpty = dueToday.length === 0 && overdue.length === 0 && inProgress.length === 0;

  const allEngaged = handoff.remaining.length === 0 && handoff.total > 0;
  const engagedTasks = state.tasks.filter(
    (task) =>
      task.assigneeId === state.userId &&
      (task.status === 'Open' || task.status === 'In Progress') &&
      !handoff.remaining.some((remainingTask) => remainingTask.id === task.id)
  );

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-950 min-h-screen">
      <div className="overflow-y-auto pb-24">
        <div className="px-5 pt-4 space-y-4">
              {isUnavailable && !handoffDone && (
                <Card className="flex items-center gap-4">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#6366f115' }}
                  >
                    <span className="text-2xl">🌙</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">You are unavailable today</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      You can still review your tasks below if needed
                    </p>
                  </div>
                </Card>
              )}

              {handoffDone ? (
                <Card className="flex items-center gap-4">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#05966915' }}
                  >
                    <span className="text-2xl text-emerald-600">&#x2714;</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Handoff Complete</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      All tasks reviewed for today
                    </p>
                  </div>
                </Card>
              ) : handoff.total === 0 ? (
                <button onClick={() => void handleNoTasksHandoff()} className="w-full text-left">
                  <Card className="flex items-center gap-4">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: color + '15' }}
                    >
                      <span className="text-2xl">☀️</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Good morning, {name.split(' ')[0]}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">No active tasks · Tap to complete handoff</p>
                    </div>
                    <div
                      className="px-4 py-2 rounded-full"
                      style={{ backgroundColor: color }}
                    >
                      <span className="text-xs font-semibold text-white">Done</span>
                    </div>
                  </Card>
                </button>
              ) : (
                <Card className="px-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base" style={{ color }}>🤚</span>
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      Daily Handoff
                    </p>
                    <div className="flex-1" />
                    <span className="text-xs font-semibold" style={{ color }}>
                      {handoff.engaged}/{handoff.total}
                    </span>
                  </div>

                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-4">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${handoff.total > 0 ? (handoff.engaged / handoff.total) * 100 : 0}%`,
                        backgroundColor: allEngaged ? '#059669' : color,
                      }}
                    />
                  </div>

                  {handoff.remaining.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 py-2.5 border-b border-gray-50 dark:border-gray-800"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                          {task.title}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">{task.site}</p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-1 shrink-0">
                        <button
                          onClick={() => goToTask(task.id)}
                          className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950 rounded-lg text-center min-w-[44px] min-h-[44px] sm:min-h-0 flex items-center justify-center"
                        >
                          <span className="text-[10px] font-semibold text-blue-600">Update</span>
                        </button>
                        <button
                          onClick={() => void handleNoChange(task.id)}
                          className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-center min-w-[44px] min-h-[44px] sm:min-h-0 flex items-center justify-center"
                        >
                          <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {isSubmittingNoChangeId === task.id ? '...' : 'Skip'}
                          </span>
                        </button>
                      </div>
                    </div>
                  ))}

                  {engagedTasks.length > 0 &&
                    engagedTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 py-2.5 border-b border-gray-50 dark:border-gray-800"
                      >
                        <span className="text-emerald-600 text-sm">&#x2714;</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-400 dark:text-gray-500 truncate">
                            {task.title}
                          </p>
                        </div>
                        <span className="text-[10px] text-green-600 font-medium">Done</span>
                      </div>
                    ))}

                  <button
                    onClick={() => void handleCompleteHandoff()}
                    disabled={!allEngaged || isSubmittingHandoff}
                    className="mt-4 py-3 rounded-xl w-full text-center"
                    style={{
                      backgroundColor: allEngaged && !isSubmittingHandoff ? color : isDark ? '#374151' : '#e5e7eb',
                    }}
                  >
                    <span
                      className="text-sm font-semibold"
                      style={{ color: allEngaged && !isSubmittingHandoff ? '#fff' : '#9ca3af' }}
                    >
                      {isSubmittingHandoff ? 'Completing...' : 'Complete Handoff'}
                    </span>
                  </button>
                </Card>
              )}

          {myPerf && (
            <PerformanceCard performance={myPerf} compact color={color} />
          )}

          {overdue.length > 0 && (
            <TaskPreviewSection
              title="Overdue"
              tasks={overdue}
              limit={5}
              onTaskPress={goToTask}
              onViewAll={goToTasks}
              titleColor="#dc2626"
              icon="alert-circle"
              iconColor="#dc2626"
            />
          )}

          {dueToday.length > 0 && (
            <TaskPreviewSection
              title="Due Today"
              tasks={dueToday}
              limit={5}
              onTaskPress={goToTask}
              onViewAll={goToTasks}
              titleColor="#d97706"
              icon="time"
              iconColor="#d97706"
            />
          )}

          {inProgress.length > 0 && (
            <TaskPreviewSection
              title="In Progress"
              tasks={inProgress}
              limit={5}
              onTaskPress={goToTask}
              onViewAll={goToTasks}
              titleColor="#3b82f6"
              icon="play-circle"
              iconColor="#3b82f6"
            />
          )}

          {isEmpty && handoffDone && (
            <div className="flex flex-col items-center py-12">
              <span className="text-5xl text-gray-300 dark:text-gray-600">&#x2714;&#x2714;</span>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-3">All clear for today</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
