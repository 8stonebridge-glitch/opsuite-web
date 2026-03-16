import { describe, expect, it } from 'vitest';
import type { AuditEntry, AvailabilityRecord, Task } from '../types';
import { getToday } from './date';
import {
  canDelegateTask,
  consecutiveNoChangeWorkdays,
  isStalledTask,
  scopeTasksForRole,
} from './task-helpers';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: overrides.id ?? 'task-1',
    title: overrides.title ?? 'Check generator',
    description: overrides.description,
    site: overrides.site ?? 'South Point',
    siteId: overrides.siteId ?? 'site-1',
    category: overrides.category,
    priority: overrides.priority ?? 'medium',
    due: overrides.due ?? null,
    assignee: overrides.assignee ?? 'Ada',
    assigneeId: overrides.assigneeId ?? 'user-1',
    teamId: overrides.teamId ?? 'team-1',
    status: overrides.status ?? 'Open',
    assignedBy: overrides.assignedBy ?? 'Owner',
    assignedByRole: overrides.assignedByRole ?? 'admin',
    note: overrides.note,
    approved: overrides.approved ?? true,
    createdAt: overrides.createdAt ?? '2026-03-10T08:00:00.000Z',
    startedAt: overrides.startedAt,
    completedAt: overrides.completedAt,
    verifiedBy: overrides.verifiedBy,
    reworked: overrides.reworked,
    reworkCount: overrides.reworkCount,
    lastActivityAt: overrides.lastActivityAt,
    accountableLeadId: overrides.accountableLeadId,
    accountableLeadName: overrides.accountableLeadName,
    delegatedAt: overrides.delegatedAt,
    lastNoChangeAt: overrides.lastNoChangeAt,
    stalledDays: overrides.stalledDays,
  };
}

function makeAudit(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    id: overrides.id ?? 'audit-1',
    taskId: overrides.taskId ?? 'task-1',
    role: overrides.role ?? 'Employee',
    message: overrides.message ?? 'No change today',
    createdAt: overrides.createdAt ?? '2026-03-18T10:00:00.000Z',
    dateTag: overrides.dateTag ?? '2026-03-18',
    updateType: overrides.updateType ?? 'No Change',
  };
}

function makeAvailability(overrides: Partial<AvailabilityRecord> = {}): AvailabilityRecord {
  return {
    id: overrides.id ?? 'avail-1',
    organizationId: overrides.organizationId ?? 'org-1',
    memberId: overrides.memberId ?? 'user-1',
    type: overrides.type ?? 'leave',
    status: overrides.status ?? 'approved',
    startDate: overrides.startDate ?? '2026-03-17',
    endDate: overrides.endDate ?? '2026-03-17',
    notes: overrides.notes ?? '',
    requestedById: overrides.requestedById ?? 'owner-1',
    approvedById: overrides.approvedById ?? 'owner-1',
    createdAt: overrides.createdAt ?? '2026-03-16T09:00:00.000Z',
    approvedAt: overrides.approvedAt ?? '2026-03-16T10:00:00.000Z',
  };
}

function addDays(dateStr: string, delta: number): string {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + delta);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function previousWeekday(dateStr: string, offset = 1): string {
  let current = dateStr;
  let remaining = offset;

  while (remaining > 0) {
    current = addDays(current, -1);
    const day = new Date(`${current}T00:00:00`).getDay();
    if (day >= 1 && day <= 5) {
      remaining -= 1;
    }
  }

  return current;
}

describe('scopeTasksForRole', () => {
  const tasks = [
    makeTask({ id: 't-1', assigneeId: 'emp-1', accountableLeadId: 'sub-1' }),
    makeTask({ id: 't-2', assigneeId: 'emp-2', accountableLeadId: 'sub-1' }),
    makeTask({ id: 't-3', assigneeId: 'emp-3', accountableLeadId: 'sub-2' }),
  ];

  it('returns every task for admins', () => {
    expect(scopeTasksForRole(tasks, 'owner-1', 'admin')).toEqual(tasks);
  });

  it('limits employees to their own tasks', () => {
    expect(scopeTasksForRole(tasks, 'emp-2', 'employee')).toEqual([tasks[1]]);
  });

  it('limits subadmins to team scope and accountable tasks', () => {
    expect(scopeTasksForRole(tasks, 'sub-1', 'subadmin', ['emp-1', 'emp-2'])).toEqual([tasks[0], tasks[1]]);
  });
});

describe('consecutiveNoChangeWorkdays', () => {
  it('counts no-change streaks across weekdays', () => {
    const today = getToday();
    const previousDay = previousWeekday(today, 1);
    const twoDaysBack = previousWeekday(today, 2);
    const audit = [
      makeAudit({ dateTag: today }),
      makeAudit({ id: 'audit-2', dateTag: previousDay }),
      makeAudit({ id: 'audit-3', dateTag: twoDaysBack }),
    ];

    expect(consecutiveNoChangeWorkdays('task-1', 'user-1', audit, today)).toBe(3);
  });

  it('pauses the streak for protected-unavailable days instead of breaking it', () => {
    const today = getToday();
    const unavailableDay = previousWeekday(today, 1);
    const twoWeekdaysBack = previousWeekday(today, 2);
    const audit = [
      makeAudit({ dateTag: today }),
      makeAudit({ id: 'audit-2', dateTag: twoWeekdaysBack }),
    ];
    const availability = [
      makeAvailability({
        memberId: 'user-1',
        startDate: unavailableDay,
        endDate: unavailableDay,
      }),
    ];

    expect(
      consecutiveNoChangeWorkdays('task-1', 'user-1', audit, today, availability),
    ).toBe(2);
  });
});

describe('isStalledTask', () => {
  it('marks active tasks as stalled when the no-change streak reaches the threshold', () => {
    const today = getToday();
    const previousDay = previousWeekday(today, 1);
    const twoDaysBack = previousWeekday(today, 2);
    const task = makeTask({
      id: 'task-1',
      assigneeId: 'user-1',
      status: 'In Progress',
      due: addDays(today, 3),
    });
    const audit = [
      makeAudit({ dateTag: today }),
      makeAudit({ id: 'audit-2', dateTag: previousDay }),
      makeAudit({ id: 'audit-3', dateTag: twoDaysBack }),
    ];

    expect(isStalledTask(task, audit, 3)).toBe(true);
  });

  it('does not mark overdue tasks as stalled', () => {
    const today = getToday();
    const task = makeTask({
      id: 'task-1',
      assigneeId: 'user-1',
      status: 'Open',
      due: addDays(today, -3),
    });
    const audit = [
      makeAudit({ dateTag: today }),
      makeAudit({ id: 'audit-2', dateTag: previousWeekday(today, 1) }),
      makeAudit({ id: 'audit-3', dateTag: previousWeekday(today, 2) }),
    ];

    expect(isStalledTask(task, audit, 2)).toBe(false);
  });
});

describe('canDelegateTask', () => {
  it('allows subadmins to delegate only when they are the accountable lead and current assignee', () => {
    const task = makeTask({
      accountableLeadId: 'sub-1',
      assigneeId: 'sub-1',
    });

    expect(canDelegateTask(task, 'sub-1', 'subadmin')).toBe(true);
  });

  it('rejects delegation for employees or already delegated tasks', () => {
    const delegatedTask = makeTask({
      accountableLeadId: 'sub-1',
      assigneeId: 'sub-1',
      delegatedAt: '2026-03-18T10:00:00.000Z',
    });

    expect(canDelegateTask(delegatedTask, 'sub-1', 'subadmin')).toBe(false);
    expect(canDelegateTask(delegatedTask, 'sub-1', 'employee')).toBe(false);
  });
});
