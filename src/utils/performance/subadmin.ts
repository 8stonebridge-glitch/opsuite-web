import type {
  Task,
  CheckIn,
  Team,
  EmployeeActionItem,
  SubadminPerformance,
  AvailabilityRecord,
} from '../../types';
import { getToday } from '../date';
import { scoreToBand, offsetDate, computeScore } from './scoring';
import { computeMetrics, computeEmployeePerformance } from './employee';

// ── Subadmin performance (team aggregate) ────────────────────────────

export function computeSubadminPerformance(
  teamId: string,
  tasks: Task[],
  checkIns: CheckIn[],
  teams: Team[],
  availability?: AvailabilityRecord[],
  orgMode?: string
): SubadminPerformance {
  const today = getToday();
  const windowEnd = today;
  const windowStart = offsetDate(today, -7);
  const prevWindowEnd = offsetDate(today, -8);
  const prevWindowStart = offsetDate(today, -14);

  const team = teams.find((t) => t.id === teamId);
  if (!team) {
    return {
      subadminId: '',
      teamId,
      score: 0,
      band: 'red',
      trendDelta: 0,
      employeeScores: [],
      atRiskCount: 0,
      actions: [],
      windowStart,
      windowEnd,
    };
  }

  const subadminId = team.lead.id;
  const memberIds = team.members.map((m) => m.id);

  const employeeScores = memberIds.map((id) => {
    const perf = computeEmployeePerformance(id, tasks, checkIns, teams, availability, orgMode);
    return { employeeId: id, score: perf.score, band: perf.band };
  });

  const avgScore =
    employeeScores.length > 0
      ? Math.round(employeeScores.reduce((s, e) => s + e.score, 0) / employeeScores.length)
      : 100;
  const band = scoreToBand(avgScore);

  const prevScores = memberIds.map((id) => {
    const prevMetrics = computeMetrics(id, tasks, checkIns, prevWindowStart, prevWindowEnd, availability);
    return computeScore(prevMetrics);
  });
  const prevAvg =
    prevScores.length > 0
      ? Math.round(prevScores.reduce((s, v) => s + v, 0) / prevScores.length)
      : 100;
  const trendDelta = avgScore - prevAvg;

  const atRiskCount = employeeScores.filter((e) => e.band !== 'green').length;

  const actions = buildTeamActions(memberIds, tasks, checkIns, teams, availability, orgMode, teamId);

  return {
    subadminId,
    teamId,
    score: avgScore,
    band,
    trendDelta,
    employeeScores,
    atRiskCount,
    actions,
    windowStart,
    windowEnd,
  };
}

function buildTeamActions(
  memberIds: string[],
  tasks: Task[],
  checkIns: CheckIn[],
  teams: Team[],
  availability: AvailabilityRecord[] | undefined,
  orgMode: string | undefined,
  teamId: string
): EmployeeActionItem[] {
  const allPerfs = memberIds.map((id) =>
    computeEmployeePerformance(id, tasks, checkIns, teams, availability, orgMode)
  );
  const actionMap = new Map<string, EmployeeActionItem>();
  for (const perf of allPerfs) {
    for (const action of perf.actions) {
      const key = action.label;
      const existing = actionMap.get(key);
      if (!existing || action.severity === 'red') {
        actionMap.set(key, {
          ...action,
          id: `team-${teamId}-${key}`,
          count: (existing?.count || 0) + action.count,
          target: `${(existing ? 1 : 0) + 1} team members affected`,
        });
      }
    }
  }
  return Array.from(actionMap.values()).slice(0, 5);
}
