'use client';

import { useMemo } from 'react';
import { useApp } from './AppContext';
import { useTeamMemberIds, useCurrentName } from './selectors-user';
import { computeCounters, scopeTasksForRole, isStalledTask, consecutiveNoChangeWorkdays } from '../utils/task-helpers';
import { getHandoffProgress } from '../utils/handoff-helpers';
import { isOverdue, getToday } from '../utils/date';
import type { Task } from '../types';

export function useScopedTasks(): Task[] {
  const { state } = useApp();
  const memberIds = useTeamMemberIds();
  return useMemo(
    () => scopeTasksForRole(state.tasks, state.userId, state.role, memberIds),
    [state.tasks, state.userId, state.role, memberIds],
  );
}

export function useMyAssignedTasks(): Task[] {
  const { state } = useApp();
  const name = useCurrentName();
  return useMemo(() => state.tasks.filter((t) => t.assignedBy === name), [state.tasks, name]);
}

export function useDashboardCounters() {
  const { state } = useApp();
  const memberIds = useTeamMemberIds();
  return useMemo(
    () => computeCounters(state.tasks, state.userId, state.role, memberIds),
    [state.tasks, state.userId, state.role, memberIds],
  );
}

export function useTaskAudit(taskId: string) {
  const { state } = useApp();
  return useMemo(
    () => state.audit.filter((a) => a.taskId === taskId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [state.audit, taskId],
  );
}

export function useBucketedTasks() {
  const scoped = useScopedTasks();
  return useMemo(() => {
    const active = scoped.filter((t) => t.status === 'Open' || t.status === 'In Progress');
    const review = scoped.filter((t) => t.status === 'Pending Approval' || t.status === 'Submitted');
    const done = scoped.filter((t) => t.status === 'Verified');
    return { active, review, done };
  }, [scoped]);
}

export function useActiveGroups() {
  const { active } = useBucketedTasks();
  const { state } = useApp();
  return useMemo(() => {
    const threshold = state.orgSettings.noChangeAlertWorkdays;
    const overdue = active.filter((t) => isOverdue(t.due, t.status));
    const stalled = active.filter(
      (t) => !isOverdue(t.due, t.status) && isStalledTask(t, state.audit, threshold, state.availability),
    );
    const stalledIds = new Set(stalled.map((t) => t.id));
    const reworked = active.filter((t) => t.reworked && !isOverdue(t.due, t.status) && !stalledIds.has(t.id));
    const inProgress = active.filter((t) => t.status === 'In Progress' && !t.reworked && !isOverdue(t.due, t.status) && !stalledIds.has(t.id));
    const unstarted = active.filter((t) => t.status === 'Open' && !t.reworked && !isOverdue(t.due, t.status) && !stalledIds.has(t.id));
    return { overdue, stalled, reworked, inProgress, unstarted };
  }, [active, state.audit, state.orgSettings.noChangeAlertWorkdays, state.availability]);
}

export function useSiteTasks(siteId: string): Task[] {
  const { state } = useApp();
  return useMemo(() => state.tasks.filter((t) => t.siteId === siteId), [state.tasks, siteId]);
}

export function useStalledDays(taskId: string): number {
  const { state } = useApp();
  return useMemo(() => {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return 0;
    return consecutiveNoChangeWorkdays(task.id, task.assigneeId, state.audit, getToday(), state.availability);
  }, [state.tasks, state.audit, state.availability, taskId]);
}

export function useNeedsDelegation(): Task[] {
  const { state } = useApp();
  return useMemo(() => {
    if (state.role !== 'subadmin' || !state.userId) return [];
    return state.tasks.filter(
      (t) => t.accountableLeadId === state.userId && t.assigneeId === state.userId && !t.delegatedAt && (t.status === 'Open' || t.status === 'In Progress'),
    );
  }, [state.tasks, state.userId, state.role]);
}

export function useHandoffProgress() {
  const { state } = useApp();
  return useMemo(
    () => getHandoffProgress(state.tasks, state.userId || '', state.audit),
    [state.tasks, state.userId, state.audit],
  );
}

export function useHasCompletedHandoffToday(): boolean {
  const { state } = useApp();
  return useMemo(() => {
    const today = getToday();
    return state.handoffs.some((h) => h.userId === state.userId && h.date === today);
  }, [state.handoffs, state.userId]);
}
