import type {
  Task,
  CheckIn,
  Team,
  ScoreBand,
  EmployeePerformanceMetrics,
  EmployeeActionItem,
  EmployeePerformance,
  AvailabilityRecord,
} from '../../types';
import { getToday, diffDays } from '../date';
import { isProtectedUnavailable } from '../availability-helpers';
import { scoreToBand, offsetDate, getWeekdaysInRange, computeScore } from './scoring';

// ── Manager lookup ────────────────────────────────────────────────────

/**
 * Returns the manager ID for an employee.
 * In managed mode: subadmin leads report to 'admin', members report to their lead.
 * In direct mode: everyone reports to 'admin' (no subadmin layer).
 */
export function managerForEmployee(employeeId: string, teams: Team[], orgMode?: string): string {
  if (orgMode === 'direct') return 'admin';
  for (const team of teams) {
    if (team.lead.id === employeeId) return 'admin'; // leads report to owner
    if (team.members.some((m) => m.id === employeeId)) return team.lead.id;
  }
  return 'admin';
}

// ── Metric computation ────────────────────────────────────────────────

export function computeMetrics(
  employeeId: string,
  tasks: Task[],
  checkIns: CheckIn[],
  windowStart: string,
  windowEnd: string,
  availability?: AvailabilityRecord[]
): EmployeePerformanceMetrics {
  const today = windowEnd;
  const empTasks = tasks.filter((t) => t.assigneeId === employeeId);
  const staleThreshold = offsetDate(today, -2);

  const activeTasks = empTasks.filter(
    (t) => t.status === 'Open' || t.status === 'In Progress'
  );
  const overdueTasks = activeTasks.filter(
    (t) => t.due && t.due < today && t.status !== 'Verified' && t.status !== 'Submitted'
  );
  const overdueRate = activeTasks.length > 0 ? overdueTasks.length / activeTasks.length : 0;

  const staleActiveCount = activeTasks.filter((t) => {
    const lastUpdate = t.lastActivityAt || t.createdAt;
    return lastUpdate < staleThreshold;
  }).length;

  const completedTasks = empTasks.filter(
    (t) =>
      (t.status === 'Submitted' || t.status === 'Verified') &&
      t.completedAt &&
      t.completedAt >= windowStart &&
      t.completedAt <= windowEnd
  );
  const onTimeTasks = completedTasks.filter(
    (t) => !t.due || (t.completedAt && t.completedAt <= t.due)
  );
  const onTimeCompletionRate =
    completedTasks.length > 0 ? onTimeTasks.length / completedTasks.length : 1;

  const criticalTasksInWindow = empTasks.filter(
    (t) => t.priority === 'critical' && t.createdAt >= windowStart && t.createdAt <= windowEnd
  );
  const respondedCritical = criticalTasksInWindow.filter((t) => {
    if (!t.startedAt) return false;
    return diffDays(t.createdAt.split('T')[0], t.startedAt.split('T')[0]) <= 1;
  });
  const criticalResponseRate =
    criticalTasksInWindow.length > 0 ? respondedCritical.length / criticalTasksInWindow.length : 1;

  const weekdays = getWeekdaysInRange(windowStart, windowEnd);
  const availableWeekdays = availability
    ? weekdays.filter((d) => !isProtectedUnavailable(employeeId, d, availability))
    : weekdays;
  const checkedInDates = new Set(
    checkIns
      .filter((c) => c.userId === employeeId && c.status === 'Checked-In')
      .map((c) => c.date)
  );
  const checkedWeekdays = availableWeekdays.filter((d) => checkedInDates.has(d));
  const hasAnyTasks = empTasks.length > 0;
  const checkInComplianceRate =
    !hasAnyTasks ? 1
    : availableWeekdays.length > 0 ? checkedWeekdays.length / availableWeekdays.length
    : 1;

  const inProgressTasks = empTasks.filter((t) => t.status === 'In Progress');
  const recentlyUpdated = inProgressTasks.filter((t) => {
    const lastUpdate = t.lastActivityAt || t.createdAt;
    return lastUpdate >= staleThreshold;
  });
  const updateConsistencyRate =
    inProgressTasks.length > 0 ? recentlyUpdated.length / inProgressTasks.length : 1;

  const allFinished = empTasks.filter(
    (t) => t.status === 'Submitted' || t.status === 'Verified'
  );
  const reworkedFinished = allFinished.filter((t) => t.reworked);
  const reworkRate =
    allFinished.length > 0 ? reworkedFinished.length / allFinished.length : 0;

  const handoffTasks = completedTasks.filter((t) => t.completedAt && t.startedAt);
  const handoffResponseRate = handoffTasks.length > 0 ? 1 : 1; // simplified

  return {
    overdueRate,
    staleActiveCount,
    onTimeCompletionRate,
    criticalResponseRate,
    checkInComplianceRate,
    updateConsistencyRate,
    reworkRate,
    handoffResponseRate,
  };
}

// ── Action generation ─────────────────────────────────────────────────

function generateActions(
  metrics: EmployeePerformanceMetrics,
  tasks: Task[],
  employeeId: string
): EmployeeActionItem[] {
  const actions: EmployeeActionItem[] = [];
  const empTasks = tasks.filter((t) => t.assigneeId === employeeId);
  const today = getToday();
  const staleThreshold = offsetDate(today, -2);

  const overdue = empTasks.filter(
    (t) =>
      t.due &&
      t.due < today &&
      t.status !== 'Verified' &&
      t.status !== 'Submitted' &&
      (t.status === 'Open' || t.status === 'In Progress')
  );
  if (overdue.length > 0) {
    actions.push({
      id: `${employeeId}-overdue`,
      severity: 'red',
      label: 'Overdue cleanup',
      count: overdue.length,
      target: `${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}`,
    });
  }

  const activeTasks = empTasks.filter(
    (t) => t.status === 'Open' || t.status === 'In Progress'
  );
  const stale = activeTasks.filter((t) => {
    const lastUpdate = t.lastActivityAt || t.createdAt;
    return lastUpdate < staleThreshold;
  });
  if (stale.length > 0) {
    actions.push({
      id: `${employeeId}-stale`,
      severity: 'amber',
      label: 'Stale task follow-up',
      count: stale.length,
      target: `${stale.length} task${stale.length > 1 ? 's' : ''} with no update in 48h`,
    });
  }

  if (metrics.checkInComplianceRate < 1) {
    const missedPct = Math.round((1 - metrics.checkInComplianceRate) * 100);
    actions.push({
      id: `${employeeId}-checkin`,
      severity: metrics.checkInComplianceRate < 0.7 ? 'red' : 'amber',
      label: 'Missed check-ins',
      count: missedPct,
      target: `${missedPct}% check-ins missed this week`,
    });
  }

  if (metrics.reworkRate > 0.2) {
    const reworkPct = Math.round(metrics.reworkRate * 100);
    actions.push({
      id: `${employeeId}-rework`,
      severity: metrics.reworkRate > 0.4 ? 'red' : 'amber',
      label: 'Repeated rework',
      count: reworkPct,
      target: `${reworkPct}% of tasks reworked`,
    });
  }

  if (metrics.updateConsistencyRate < 0.8) {
    const missingPct = Math.round((1 - metrics.updateConsistencyRate) * 100);
    actions.push({
      id: `${employeeId}-updates`,
      severity: 'amber',
      label: 'Missing progress updates',
      count: missingPct,
      target: `${missingPct}% of tasks missing updates`,
    });
  }

  const severityOrder: Record<ScoreBand, number> = { red: 0, amber: 1, green: 2 };
  actions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return actions;
}

// ── Main: compute employee performance ───────────────────────────────

export function computeEmployeePerformance(
  employeeId: string,
  tasks: Task[],
  checkIns: CheckIn[],
  teams: Team[],
  availability?: AvailabilityRecord[],
  orgMode?: string
): EmployeePerformance {
  const today = getToday();
  const windowEnd = today;
  const windowStart = offsetDate(today, -7);
  const prevWindowEnd = offsetDate(today, -8);
  const prevWindowStart = offsetDate(today, -14);

  const managerId = managerForEmployee(employeeId, teams, orgMode);

  const metrics = computeMetrics(employeeId, tasks, checkIns, windowStart, windowEnd, availability);
  const score = computeScore(metrics);
  const band = scoreToBand(score);

  const prevMetrics = computeMetrics(
    employeeId, tasks, checkIns, prevWindowStart, prevWindowEnd, availability
  );
  const prevScore = computeScore(prevMetrics);
  const trendDelta = score - prevScore;

  const actions = generateActions(metrics, tasks, employeeId);

  return {
    employeeId,
    managerId,
    score,
    band,
    trendDelta,
    metrics,
    actions,
    windowStart,
    windowEnd,
  };
}
