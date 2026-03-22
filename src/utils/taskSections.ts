import type { Task, Team, AuditEntry, AvailabilityRecord, FilterValue } from '../types';
import { isOverdue } from './date';
import { isStalledTask } from './task-helpers';

export interface TaskSection {
  title: string;
  data: Task[];
}

type GroupBy = 'status' | 'site' | 'team';

export function buildTaskSections(
  filteredTasks: Task[],
  filter: FilterValue,
  groupBy: GroupBy,
  teams: Team[],
  stalledThreshold: number,
  audit: AuditEntry[],
  availability: AvailabilityRecord[] | undefined
): TaskSection[] {
  if (groupBy === 'site') return groupBySite(filteredTasks);
  if (groupBy === 'team') return groupByTeam(filteredTasks, teams);
  return buildStatusSections(filteredTasks, filter, stalledThreshold, audit, availability);
}

function groupBySite(tasks: Task[]): TaskSection[] {
  const bySite = new Map<string, Task[]>();
  for (const t of tasks) {
    const key = t.site || 'Unknown';
    if (!bySite.has(key)) bySite.set(key, []);
    bySite.get(key)!.push(t);
  }
  return Array.from(bySite.entries()).map(([title, data]) => ({ title, data }));
}

function groupByTeam(tasks: Task[], teams: Team[]): TaskSection[] {
  const byTeam = new Map<string, Task[]>();
  for (const t of tasks) {
    const team = teams.find((tm) => tm.id === t.teamId);
    const key = team?.name || 'Unknown';
    if (!byTeam.has(key)) byTeam.set(key, []);
    byTeam.get(key)!.push(t);
  }
  return Array.from(byTeam.entries()).map(([title, data]) => ({ title, data }));
}

function buildStatusSections(
  filteredTasks: Task[],
  filter: FilterValue,
  stalledThreshold: number,
  audit: AuditEntry[],
  availability: AvailabilityRecord[] | undefined
): TaskSection[] {
  if (filter === 'active') return buildActiveSections(filteredTasks, stalledThreshold, audit, availability);
  if (filter === 'review') return buildReviewSections(filteredTasks);
  if (filter === 'done') return filteredTasks.length ? [{ title: 'Done', data: filteredTasks }] : [];
  return [];
}

function buildActiveSections(
  filteredTasks: Task[],
  stalledThreshold: number,
  audit: AuditEntry[],
  availability: AvailabilityRecord[] | undefined
): TaskSection[] {
  const overdueTasks = filteredTasks.filter((t) => isOverdue(t.due, t.status));
  const stalledTasks = filteredTasks.filter(
    (t) =>
      !isOverdue(t.due, t.status) &&
      (typeof t.stalledDays === 'number'
        ? t.stalledDays >= stalledThreshold
        : isStalledTask(t, audit, stalledThreshold, availability))
  );
  const stalledIds = new Set(stalledTasks.map((t) => t.id));
  const reworkTasks = filteredTasks.filter(
    (t) => t.reworked && !isOverdue(t.due, t.status) && !stalledIds.has(t.id)
  );
  const normalTasks = filteredTasks.filter(
    (t) => !isOverdue(t.due, t.status) && !t.reworked && !stalledIds.has(t.id)
  );
  const groups: TaskSection[] = [];
  if (overdueTasks.length) groups.push({ title: 'Overdue', data: overdueTasks });
  if (stalledTasks.length) groups.push({ title: 'Stalled', data: stalledTasks });
  if (reworkTasks.length) groups.push({ title: 'Rework', data: reworkTasks });
  if (normalTasks.length) groups.push({ title: 'Active', data: normalTasks });
  return groups;
}

function buildReviewSections(filteredTasks: Task[]): TaskSection[] {
  const pending = filteredTasks.filter((t) => t.status === 'Pending Approval');
  const submitted = filteredTasks.filter((t) => t.status === 'Submitted');
  const groups: TaskSection[] = [];
  if (pending.length) groups.push({ title: 'Pending Approval', data: pending });
  if (submitted.length) groups.push({ title: 'Awaiting Verification', data: submitted });
  return groups;
}
