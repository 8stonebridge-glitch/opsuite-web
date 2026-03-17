'use client';

import { useMemo } from 'react';
import { useApp } from './AppContext';
import { computeCheckInStats, type CheckInStats } from '../utils/checkin-helpers';
import { isOverdue, getToday } from '../utils/date';
import type { CheckIn } from '../types';

export interface SiteHealth {
  totalActive: number;
  overdue: number;
  review: number;
  checkInRate: number;
}

export function useSiteHealth(siteId: string): SiteHealth {
  const { state } = useApp();
  return useMemo(() => {
    const siteTasks = state.tasks.filter((t) => t.siteId === siteId);
    const totalActive = siteTasks.filter((t) => t.status === 'Open' || t.status === 'In Progress').length;
    const overdue = siteTasks.filter((t) => isOverdue(t.due, t.status)).length;
    const review = siteTasks.filter((t) => t.status === 'Pending Approval' || t.status === 'Submitted').length;
    const today = getToday();
    const siteEmpIds = [...new Set(siteTasks.map((t) => t.assigneeId))];
    const checkedIn = siteEmpIds.filter((eid) =>
      state.checkIns.some((c) => c.userId === eid && c.date === today && c.status === 'Checked-In'),
    ).length;
    const checkInRate = siteEmpIds.length > 0 ? Math.round((checkedIn / siteEmpIds.length) * 100) : 0;
    return { totalActive, overdue, review, checkInRate };
  }, [state.tasks, state.checkIns, siteId]);
}

export interface TeamHealth {
  totalActive: number;
  overdue: number;
  review: number;
  completedThisWeek: number;
}

export function useTeamHealth(teamId: string): TeamHealth {
  const { state } = useApp();
  return useMemo(() => {
    const teamTasks = state.tasks.filter((t) => t.teamId === teamId);
    const totalActive = teamTasks.filter((t) => t.status === 'Open' || t.status === 'In Progress').length;
    const overdue = teamTasks.filter((t) => isOverdue(t.due, t.status)).length;
    const review = teamTasks.filter((t) => t.status === 'Pending Approval' || t.status === 'Submitted').length;
    const today = new Date(getToday() + 'T00:00:00');
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    const weekStart = monday.toISOString().split('T')[0];
    const completedThisWeek = teamTasks.filter(
      (t) => (t.status === 'Submitted' || t.status === 'Verified') && t.completedAt && t.completedAt >= weekStart,
    ).length;
    return { totalActive, overdue, review, completedThisWeek };
  }, [state.tasks, teamId]);
}

export function useCheckInHealth(employeeIds: string[]) {
  const { state } = useApp();
  return useMemo(() => {
    const today = getToday();
    const total = employeeIds.length;
    const checkedInToday = employeeIds.filter((eid) =>
      state.checkIns.some((c) => c.userId === eid && c.date === today && c.status === 'Checked-In'),
    ).length;
    const rate = total > 0 ? Math.round((checkedInToday / total) * 100) : 0;
    return { checkedInToday, total, rate };
  }, [state.checkIns, employeeIds]);
}

export function useMyCheckIns(): CheckIn[] {
  const { state } = useApp();
  return useMemo(
    () => state.checkIns.filter((c) => c.userId === state.userId).sort((a, b) => b.date.localeCompare(a.date)),
    [state.checkIns, state.userId],
  );
}

export function useCheckInStats(year?: number, month?: number): CheckInStats {
  const { state } = useApp();
  return useMemo(
    () => computeCheckInStats(state.checkIns, state.userId || '', year, month),
    [state.checkIns, state.userId, year, month],
  );
}
