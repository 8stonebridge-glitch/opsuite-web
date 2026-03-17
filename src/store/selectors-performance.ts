'use client';

import { useMemo } from 'react';
import { useApp } from './AppContext';
import { computeEmployeePerformance, computeSubadminPerformance } from '../utils/performance';
import { isOverdue, getToday } from '../utils/date';
import type { EmployeePerformance, SubadminPerformance } from '../types';

export interface EmployeeSummary {
  activeCount: number;
  overdueCount: number;
  lastActivity: string | null;
  checkedInToday: boolean;
}

export function useEmployeeSummaries(): Map<string, EmployeeSummary> {
  const { state } = useApp();
  return useMemo(() => {
    const today = getToday();
    const map = new Map<string, EmployeeSummary>();
    for (const emp of state.allEmployees) {
      const empTasks = state.tasks.filter((t) => t.assigneeId === emp.id);
      const activeCount = empTasks.filter((t) => t.status === 'Open' || t.status === 'In Progress').length;
      const overdueCount = empTasks.filter((t) => isOverdue(t.due, t.status)).length;
      const taskDates = empTasks.map((t) => t.lastActivityAt || t.createdAt).sort((a, b) => b.localeCompare(a));
      const checkInDates = state.checkIns.filter((c) => c.userId === emp.id && c.status === 'Checked-In').map((c) => c.date).sort((a, b) => b.localeCompare(a));
      const candidates = [...taskDates.slice(0, 1), ...checkInDates.slice(0, 1)].sort((a, b) => b.localeCompare(a));
      const checkedInToday = state.checkIns.some((c) => c.userId === emp.id && c.date === today && c.status === 'Checked-In');
      map.set(emp.id, { activeCount, overdueCount, lastActivity: candidates[0] ?? null, checkedInToday });
    }
    return map;
  }, [state.tasks, state.checkIns, state.allEmployees]);
}

export function useMyDayData() {
  const { state } = useApp();
  return useMemo(() => {
    const today = getToday();
    const myTasks = state.tasks.filter((t) => t.assigneeId === state.userId);
    const dueToday = myTasks.filter((t) => t.due === today && (t.status === 'Open' || t.status === 'In Progress'));
    const overdue = myTasks.filter((t) => isOverdue(t.due, t.status));
    const inProgress = myTasks.filter((t) => t.status === 'In Progress' && !isOverdue(t.due, t.status));
    const checkedInToday = state.checkIns.some((c) => c.userId === state.userId && c.date === today && c.status === 'Checked-In');
    return { dueToday, overdue, inProgress, checkedInToday };
  }, [state.tasks, state.checkIns, state.userId]);
}

export function useEmployeePerformance(employeeId: string): EmployeePerformance {
  const { state } = useApp();
  return useMemo(
    () => computeEmployeePerformance(employeeId, state.tasks, state.checkIns, state.teams, state.availability, state.orgMode),
    [employeeId, state.tasks, state.checkIns, state.teams, state.availability, state.orgMode],
  );
}

export function useAllEmployeePerformances(): Map<string, EmployeePerformance> {
  const { state } = useApp();
  return useMemo(() => {
    const map = new Map<string, EmployeePerformance>();
    for (const emp of state.allEmployees) {
      map.set(emp.id, computeEmployeePerformance(emp.id, state.tasks, state.checkIns, state.teams, state.availability, state.orgMode));
    }
    return map;
  }, [state.tasks, state.checkIns, state.allEmployees, state.teams, state.availability, state.orgMode]);
}

export function useSubadminPerformance(teamId: string): SubadminPerformance {
  const { state } = useApp();
  return useMemo(
    () => computeSubadminPerformance(teamId, state.tasks, state.checkIns, state.teams, state.availability, state.orgMode),
    [teamId, state.tasks, state.checkIns, state.teams, state.availability, state.orgMode],
  );
}

export function useAtRiskEmployees(limit?: number): EmployeePerformance[] {
  const allPerfs = useAllEmployeePerformances();
  return useMemo(() => {
    const atRisk = Array.from(allPerfs.values()).filter((p) => p.band !== 'green').sort((a, b) => a.score - b.score);
    return limit ? atRisk.slice(0, limit) : atRisk;
  }, [allPerfs, limit]);
}

export function useMyPerformance(): EmployeePerformance | null {
  const { state } = useApp();
  return useMemo(() => {
    if (state.role === 'admin' || !state.userId) return null;
    return computeEmployeePerformance(state.userId, state.tasks, state.checkIns, state.teams, state.availability, state.orgMode);
  }, [state.role, state.userId, state.tasks, state.checkIns, state.teams, state.availability, state.orgMode]);
}
