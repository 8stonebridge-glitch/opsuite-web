import type { Task, TaskStatus, Role, AuditEntry, AvailabilityRecord } from '../types';
import { getToday, isOverdue } from './date';
import { isProtectedUnavailable } from './availability-helpers';

export function getNextStatuses(
  current: TaskStatus,
  role: Role,
  isAssignee = false
): TaskStatus[] {
  // Rule 3: Only the assigned person can start or submit a task.
  // Managers cannot submit on behalf of others.
  if (isAssignee) {
    if (current === 'Open') return ['In Progress'];
    if (current === 'In Progress') return ['Submitted'];
  }

  // Admin/subadmin can approve and reopen
  if (role === 'subadmin' || role === 'admin') {
    if (current === 'Pending Approval') return ['Open'];
    if (current === 'Verified') return ['Open'];
  }

  return [];
}

export interface DashboardCounters {
  active: number;
  needsReview: number;
  alerts: number;
  overdue: number;
}

export function computeCounters(
  tasks: Task[],
  userId: string | null,
  role: Role,
  teamMemberIds?: string[]
): DashboardCounters {
  const scoped = scopeTasksForRole(tasks, userId, role, teamMemberIds);
  const today = new Date().toISOString().split('T')[0];

  const active = scoped.filter(
    (t) => t.status === 'Open' || t.status === 'In Progress'
  ).length;

  const needsReview = scoped.filter(
    (t) => t.status === 'Pending Approval' || t.status === 'Submitted'
  ).length;

  const overdueList = scoped.filter(
    (t) =>
      t.due &&
      t.due < today &&
      !['Verified', 'Submitted'].includes(t.status)
  );

  const reworkList = scoped.filter(
    (t) => t.reworked && t.status !== 'Verified'
  );

  const alertIds = new Set([
    ...overdueList.map((t) => t.id),
    ...reworkList.map((t) => t.id),
  ]);

  return {
    active,
    needsReview,
    alerts: alertIds.size,
    overdue: overdueList.length,
  };
}

export function scopeTasksForRole(
  tasks: Task[],
  userId: string | null,
  role: Role,
  teamMemberIds?: string[]
): Task[] {
  if (role === 'admin') return tasks;
  if (role === 'subadmin' && teamMemberIds) {
    return tasks.filter(
      (t) =>
        teamMemberIds.includes(t.assigneeId) ||
        t.assigneeId === userId ||
        t.accountableLeadId === userId
    );
  }
  if (role === 'employee' && userId) {
    return tasks.filter((t) => t.assigneeId === userId);
  }
  return [];
}

// ── Stalled task detection ──────────────────────────────────────────

/**
 * Check if a date string falls on a weekday (Mon-Fri).
 */
function isWeekday(dateStr: string): boolean {
  const day = new Date(dateStr + 'T00:00:00').getDay();
  return day >= 1 && day <= 5;
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Count consecutive workdays (backwards from today) where the only
 * audit events for this task+assignee are "No Change".
 */
export function consecutiveNoChangeWorkdays(
  taskId: string,
  assigneeId: string,
  audit: AuditEntry[],
  today: string,
  availability?: AvailabilityRecord[]
): number {
  const taskAudit = audit.filter((a) => a.taskId === taskId);
  let count = 0;
  const cursor = new Date(today + 'T00:00:00');

  for (let i = 0; i < 60; i++) {
    const dateStr = formatLocalDate(cursor);

    if (!isWeekday(dateStr)) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }

    if (availability && isProtectedUnavailable(assigneeId, dateStr, availability)) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }

    const dayEntries = taskAudit.filter((a) => a.dateTag === dateStr);

    if (dayEntries.length === 0) {
      break;
    }

    const allNoChange = dayEntries.every((a) => a.updateType === 'No Change');
    if (allNoChange) {
      count++;
    } else {
      break;
    }

    cursor.setDate(cursor.getDate() - 1);
  }

  return count;
}

/**
 * Determine if a task is stalled: active, not overdue, and consecutive
 * no-change workdays >= threshold.
 */
export function isStalledTask(
  task: Task,
  audit: AuditEntry[],
  threshold: number,
  availability?: AvailabilityRecord[]
): boolean {
  // Must be active (Open or In Progress)
  if (task.status !== 'Open' && task.status !== 'In Progress') return false;
  // Must not be overdue (overdue is its own group)
  if (isOverdue(task.due, task.status)) return false;

  const today = getToday();
  const days = consecutiveNoChangeWorkdays(task.id, task.assigneeId, audit, today, availability);
  return days >= threshold;
}

// ── Delegation helpers ──────────────────────────────────────────────

/**
 * Get delegation mode: 'managed' if accountableLeadId is set and not 'admin'.
 */
export function getDelegationMode(task: Task): 'direct' | 'managed' {
  return task.accountableLeadId && task.accountableLeadId !== 'admin'
    ? 'managed'
    : 'direct';
}

/**
 * Can a subadmin delegate this task? True if:
 * - task.accountableLeadId === userId (they're the accountable lead)
 * - task.assigneeId === userId (not yet delegated to someone else)
 */
export function canDelegateTask(
  task: Task,
  userId: string,
  role: Role
): boolean {
  if (role !== 'subadmin') return false;
  return (
    task.accountableLeadId === userId &&
    task.assigneeId === userId &&
    !task.delegatedAt
  );
}
