'use client';

import { useMemo } from 'react';
import { useApp } from '@/store/AppContext';
import {
  useBucketedTasks,
  useAtRiskEmployees,
  useTeams,
  useIndustryColor,
} from '@/store/selectors';
import { KpiRow } from '@/components/overview/KpiRow';
import { AtRiskSection } from '@/components/performance/AtRiskSection';
import { ExportButton } from '@/components/reports/ExportButton';
import { FreshnessLabel } from '@/components/reports/FreshnessLabel';
import { Card, CardContent } from '@/components/ui/Card';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { SectionHeader } from '@/components/overview/OverviewHelpers';
import { isOverdue } from '@/utils/date';
import type { Task, TaskStatus } from '@/types';

// ── helpers (pure, no hooks) ───────────────────────────────────────

function completionRate(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  const completed = tasks.filter(
    (t) => t.status === 'Verified' || t.status === 'Submitted',
  ).length;
  return Math.round((completed / tasks.length) * 100);
}

function avgDaysToComplete(tasks: Task[]): number {
  const completed = tasks.filter((t) => t.completedAt && t.createdAt);
  if (completed.length === 0) return 0;
  const totalDays = completed.reduce((sum, t) => {
    const start = new Date(t.createdAt).getTime();
    const end = new Date(t.completedAt!).getTime();
    return sum + (end - start) / (1000 * 60 * 60 * 24);
  }, 0);
  return Math.round((totalDays / completed.length) * 10) / 10;
}

function overduePercent(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  const count = tasks.filter((t) => isOverdue(t.due, t.status)).length;
  return Math.round((count / tasks.length) * 100);
}

function reworkRate(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  const reworked = tasks.filter((t) => t.reworked).length;
  return Math.round((reworked / tasks.length) * 100);
}

const STATUS_ORDER: TaskStatus[] = [
  'Open',
  'In Progress',
  'Submitted',
  'Pending Approval',
  'Verified',
];

const STATUS_COLORS: Record<TaskStatus, string> = {
  Open: '#6366f1',
  'In Progress': '#0ea5e9',
  Submitted: '#d97706',
  'Pending Approval': '#ea580c',
  Verified: '#059669',
};

// ── page component ─────────────────────────────────────────────────

export default function ReportsPage() {
  const { state } = useApp();
  const color = useIndustryColor();
  const teams = useTeams();
  const { active, review, done } = useBucketedTasks();
  const atRisk = useAtRiskEmployees(10);
  const tasks = state.tasks;
  const audit = state.audit;

  // Summary stats
  const stats = useMemo(
    () => ({
      total: tasks.length,
      completion: completionRate(tasks),
      avgDays: avgDaysToComplete(tasks),
      overdue: overduePercent(tasks),
      rework: reworkRate(tasks),
    }),
    [tasks],
  );

  // Status breakdown counts
  const statusCounts = useMemo(() => {
    const map: Record<TaskStatus, number> = {
      Open: 0,
      'In Progress': 0,
      Submitted: 0,
      'Pending Approval': 0,
      Verified: 0,
    };
    for (const t of tasks) {
      map[t.status] = (map[t.status] || 0) + 1;
    }
    return map;
  }, [tasks]);

  // Team performance
  const teamRows = useMemo(() => {
    return teams.map((team) => {
      const teamTasks = tasks.filter((t) => t.teamId === team.id);
      const assigned = teamTasks.length;
      const completed = teamTasks.filter(
        (t) => t.status === 'Verified' || t.status === 'Submitted',
      ).length;
      const overdueCount = teamTasks.filter((t) =>
        isOverdue(t.due, t.status),
      ).length;
      const reworkCount = teamTasks.filter((t) => t.reworked).length;
      const rr = assigned > 0 ? Math.round((reworkCount / assigned) * 100) : 0;
      const score =
        assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
      return {
        id: team.id,
        name: team.name,
        assigned,
        completed,
        overdue: overdueCount,
        reworkRate: rr,
        score,
      };
    });
  }, [teams, tasks]);

  // Recent audit entries (last 20)
  const recentAudit = useMemo(
    () =>
      [...audit]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 20),
    [audit],
  );

  return (
    <div className="flex-1 bg-surface-50 dark:bg-surface-950 min-h-screen">
      {/* Page Header */}
      <div className="bg-white dark:bg-surface-900 border-b border-surface-100 dark:border-surface-800">
        <div className="px-5 lg:px-6 py-5 lg:py-6 flex items-center justify-between">
          <div>
            <p className="text-caption text-surface-400 dark:text-surface-500">
              Reports
            </p>
            <h1 className="text-xl lg:text-title text-surface-900 dark:text-surface-100 mt-0.5">
              Reporting Dashboard
            </h1>
          </div>
          <ExportButton />
        </div>
        <div className="px-5 lg:px-6 pb-2">
          <FreshnessLabel lastUpdated={new Date().toISOString()} isRealtime />
        </div>
      </div>

      <div className="overflow-y-auto">
        <div className="px-5 lg:px-6 pt-5 space-y-6 pb-28 md:pb-8">
          {/* Summary Stats */}
          <KpiRow
            items={[
              { label: 'Total Tasks', value: stats.total, color },
              {
                label: 'Completion',
                value: stats.completion,
                color: '#059669',
              },
              { label: 'Avg Days', value: stats.avgDays, color: '#0ea5e9' },
              { label: 'Overdue %', value: stats.overdue, color: '#dc2626' },
              { label: 'Rework %', value: stats.rework, color: '#d97706' },
            ]}
          />

          <div className="lg:grid lg:grid-cols-2 lg:gap-6">
            {/* Task Status Breakdown */}
            <section>
              <SectionHeader title="Task Status Breakdown" />
              <Card>
                <CardContent className="py-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-surface-500 dark:text-surface-400 text-xs uppercase tracking-wider">
                          Status
                        </TableHead>
                        <TableHead className="text-surface-500 dark:text-surface-400 text-xs uppercase tracking-wider text-right">
                          Count
                        </TableHead>
                        <TableHead className="text-surface-500 dark:text-surface-400 text-xs uppercase tracking-wider text-right">
                          %
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {STATUS_ORDER.map((status) => {
                        const count = statusCounts[status];
                        const pct =
                          tasks.length > 0
                            ? Math.round((count / tasks.length) * 100)
                            : 0;
                        return (
                          <TableRow key={status}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{
                                    backgroundColor: STATUS_COLORS[status],
                                  }}
                                />
                                <span className="text-caption text-surface-900 dark:text-surface-100">
                                  {status}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-caption text-surface-700 dark:text-surface-300">
                              {count}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-caption text-surface-400 dark:text-surface-500">
                              {pct}%
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </section>

            {/* At-Risk Employees */}
            <section>
              {atRisk.length > 0 ? (
                <AtRiskSection employees={atRisk} limit={10} />
              ) : (
                <>
                  <SectionHeader title="At-Risk Employees" />
                  <Card>
                    <CardContent className="py-6 text-center">
                      <p className="text-caption text-surface-400 dark:text-surface-500">
                        No at-risk employees
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}
            </section>
          </div>

          {/* Team Performance */}
          {teamRows.length > 0 && (
            <section>
              <SectionHeader title="Team Performance" count={teamRows.length} />
              <Card>
                <CardContent className="py-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-surface-500 dark:text-surface-400 text-xs uppercase tracking-wider">
                          Team
                        </TableHead>
                        <TableHead className="text-surface-500 dark:text-surface-400 text-xs uppercase tracking-wider text-right">
                          Assigned
                        </TableHead>
                        <TableHead className="text-surface-500 dark:text-surface-400 text-xs uppercase tracking-wider text-right">
                          Completed
                        </TableHead>
                        <TableHead className="text-surface-500 dark:text-surface-400 text-xs uppercase tracking-wider text-right">
                          Overdue
                        </TableHead>
                        <TableHead className="text-surface-500 dark:text-surface-400 text-xs uppercase tracking-wider text-right">
                          Rework %
                        </TableHead>
                        <TableHead className="text-surface-500 dark:text-surface-400 text-xs uppercase tracking-wider text-right">
                          Score
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teamRows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="text-caption font-medium text-surface-900 dark:text-surface-100">
                            {row.name}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-caption text-surface-700 dark:text-surface-300">
                            {row.assigned}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-caption text-surface-700 dark:text-surface-300">
                            {row.completed}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-caption">
                            <span
                              className={
                                row.overdue > 0
                                  ? 'text-red-500'
                                  : 'text-surface-700 dark:text-surface-300'
                              }
                            >
                              {row.overdue}
                            </span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-caption">
                            <span
                              className={
                                row.reworkRate > 20
                                  ? 'text-amber-500'
                                  : 'text-surface-700 dark:text-surface-300'
                              }
                            >
                              {row.reworkRate}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-caption">
                            <span
                              className={`inline-flex items-center justify-center h-6 min-w-[40px] px-2 rounded-full text-[11px] font-bold ${
                                row.score >= 75
                                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                                  : row.score >= 50
                                    ? 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400'
                                    : 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400'
                              }`}
                            >
                              {row.score}%
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Activity Feed */}
          <section>
            <SectionHeader
              title="Recent Activity"
              count={recentAudit.length}
            />
            <Card>
              <CardContent className="py-0">
                {recentAudit.length === 0 ? (
                  <div className="py-6 text-center">
                    <p className="text-caption text-surface-400 dark:text-surface-500">
                      No audit activity yet
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-surface-100 dark:divide-surface-800">
                    {recentAudit.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-start gap-3 py-3"
                      >
                        <div className="mt-1.5">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              entry.updateType === 'Rework' ||
                              entry.updateType === 'Escalation'
                                ? 'bg-red-400'
                                : entry.updateType === 'Completion' ||
                                    entry.updateType === 'Verification'
                                  ? 'bg-emerald-400'
                                  : 'bg-surface-300 dark:bg-surface-600'
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-caption text-surface-900 dark:text-surface-100 leading-snug">
                            {entry.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] text-surface-400 dark:text-surface-500">
                              {entry.role}
                            </span>
                            <span className="text-[11px] text-surface-300 dark:text-surface-600">
                              ·
                            </span>
                            <span className="text-[11px] text-surface-400 dark:text-surface-500">
                              {entry.updateType}
                            </span>
                            <span className="text-[11px] text-surface-300 dark:text-surface-600">
                              ·
                            </span>
                            <span className="text-[11px] text-surface-400 dark:text-surface-500">
                              {new Date(entry.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
