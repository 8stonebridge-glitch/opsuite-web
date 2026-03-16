'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useApp } from '../../store/AppContext';
import {
  useCurrentName,
  useCurrentRoleLabel,
  useIndustryColor,
} from '../../store/selectors';
import { useTheme } from '../../providers/ThemeProvider';
import { getNextStatuses } from '../../utils/task-helpers';
import { getToday, getNowISO } from '../../utils/date';
import { StatusBadge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import type { TaskStatus } from '../../types';

const STATUS_DISPLAY: Record<string, string> = {
  'Open': 'Open',
  'In Progress': 'In Progress',
  'Pending Approval': 'Pending',
  'Submitted': 'Submitted',
  'Verified': 'Verified',
};

export function TaskUpdateScreen() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { state, dispatch } = useApp();
  const { isDark } = useTheme();
  const color = useIndustryColor();
  const curName = useCurrentName();
  const curRoleLabel = useCurrentRoleLabel();

  const task = state.tasks.find((t) => t.id === id);
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | ''>('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!task) {
    return (
      <div className="flex-1 bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen">
        <span className="text-surface-400 dark:text-surface-500">Task not found</span>
      </div>
    );
  }

  const isAssignee = task.assigneeId === state.userId;
  const nextStatuses = getNextStatuses(task.status, state.role, isAssignee);
  const newStatus = selectedStatus || (nextStatuses.length === 1 ? nextStatuses[0] : '');

  const handleSubmit = async () => {
    if (!newStatus) return;
    setError('');

    const today = getToday();
    const now = getNowISO();

    const isStart = newStatus === 'In Progress' && task.status === 'Open';
    const isSubmitted = newStatus === 'Submitted';

    dispatch({
      type: 'UPDATE_TASK',
      taskId: task.id,
      updates: {
        status: newStatus,
        startedAt: isStart ? today : task.startedAt,
        completedAt: isSubmitted ? today : task.completedAt,
      },
    });

    if (note.trim()) {
      dispatch({
        type: 'ADD_AUDIT',
        entry: {
          taskId: task.id, role: curRoleLabel, message: note.trim(),
          createdAt: now, dateTag: today, updateType: 'Progress Update',
        },
      });
    }

    if (isStart) {
      dispatch({
        type: 'ADD_AUDIT',
        entry: {
          taskId: task.id, role: 'System',
          message: `Task started on ${today} by ${curName} (${curRoleLabel}). Status: Open -> Active.`,
          createdAt: now, dateTag: today, updateType: 'Status',
        },
      });
    }

    if (isSubmitted) {
      dispatch({
        type: 'ADD_AUDIT',
        entry: {
          taskId: task.id, role: 'System',
          message: `Task submitted on ${today} by ${curName} (${curRoleLabel}). Awaiting verification.`,
          createdAt: now, dateTag: today, updateType: 'Status',
        },
      });
      if (task.assignedBy) {
        dispatch({
          type: 'ADD_AUDIT',
          entry: {
            taskId: task.id, role: 'System',
            message: `Notification sent to ${task.assignedBy}: "${task.title}" has been submitted by ${curName}.`,
            createdAt: now, dateTag: today, updateType: 'Notification',
          },
        });
      }
    }

    router.back();
  };

  return (
    <div className="flex-1 bg-surface-50 dark:bg-surface-950 min-h-screen">
      <div className="bg-white dark:bg-surface-900 px-5 py-4 flex items-center gap-3 border-b border-surface-100 dark:border-surface-800">
        <button onClick={() => router.back()}>
          <span style={{ color: isDark ? '#d1d5db' : '#374151', fontSize: 20 }}>&larr;</span>
        </button>
        <span className="text-heading text-surface-900 dark:text-surface-100 flex-1">Update Task</span>
      </div>

      <div className="flex-1 px-5 overflow-auto pb-24 pt-4">
        <Card className="mb-4">
          <p className="text-heading text-surface-900 dark:text-surface-100 mb-2">{task.title}</p>
          <div className="flex items-center gap-2">
            <span className="text-caption text-surface-400 dark:text-surface-500">Current:</span>
            <StatusBadge status={task.status} />
          </div>
        </Card>

        {nextStatuses.length > 0 && (
          <div className="mb-4">
            <span className="text-micro text-surface-400 dark:text-surface-500 uppercase tracking-wider block mb-3">
              New status
            </span>
            <div className="flex gap-2">
              {nextStatuses.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedStatus(s)}
                  className={`flex-1 py-3.5 rounded-xl text-center border ${
                    (selectedStatus === s || (nextStatuses.length === 1))
                      ? 'border-transparent'
                      : 'border-surface-200 dark:border-surface-700'
                  }`}
                  style={
                    (selectedStatus === s || nextStatuses.length === 1)
                      ? { backgroundColor: color }
                      : undefined
                  }
                >
                  <span
                    className={`text-caption ${
                      (selectedStatus === s || nextStatuses.length === 1)
                        ? 'text-white'
                        : 'text-surface-500 dark:text-surface-400'
                    }`}
                  >
                    {STATUS_DISPLAY[s] || s}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6">
          <span className="text-micro text-surface-400 dark:text-surface-500 uppercase tracking-wider block mb-2">
            Add a note (optional)
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What progress have you made?"
            rows={4}
            className="bg-white dark:bg-surface-900 rounded-card px-4 py-3.5 text-body text-surface-900 dark:text-surface-100 border border-surface-200 dark:border-surface-700 min-h-[100px] w-full resize-none outline-none"
          />
        </div>

        {error ? (
          <p className="text-body text-red-600 mb-4">{error}</p>
        ) : null}

        <Button
          onClick={() => void handleSubmit()}
          disabled={!newStatus || isSubmitting}
          style={{ backgroundColor: color }}
        >{isSubmitting ? 'Saving...' : 'Submit Update'}</Button>
      </div>
    </div>
  );
}
