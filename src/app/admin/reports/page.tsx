'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

const RechartsLineChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.LineChart })),
  { ssr: false },
);
const RechartsBarChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.BarChart })),
  { ssr: false },
);
const RechartsResponsiveContainer = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.ResponsiveContainer })),
  { ssr: false },
);

// These are used as children of the dynamic charts, imported statically
import {
  Line,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { useApp } from '@/store/AppContext';
import {
  useBucketedTasks,
  useAtRiskEmployees,
  useTeams,
  useIndustryColor,
} from '@/store/selectors';
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
import { EmptyState } from '@/components/ui/EmptyState';
import { isOverdue } from '@/utils/date';
import { Users, Activity } from 'lucide-react';
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

// ── WoW mock delta helper ─────────────────────────────────────────

function mockDelta(): { value: number; direction: 'up' | 'down' | 'flat' } {
  const v = Math.floor(Math.random() * 30) - 10;
  return { value: Math.abs(v), direction: v > 0 ? 'up' : v < 0 ? 'down' : 'flat' };
}

function WoWBadge({ delta }: { delta: { value: number; direction: 'up' | 'down' | 'flat' } }) {
  if (delta.direction === 'flat') {
    return (
      <span className="text-[11px] text-surface-400 dark:text-surface-500 font-medium">
        — 0% WoW
      </span>
    );
  }
  const isUp = delta.direction === 'up';
  return (
    <span
      className={`text-[11px] font-medium ${
        isUp
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-red-600 dark:text-red-400'
      }`}
    >
      {isUp ? '↑' : '↓'}{delta.value}% WoW
    </span>
  );
}

// ── trend data (mock) ─────────────────────────────────────────────

const trendData = Array.from({ length: 8 }, (_, i) => ({
  week: `W${i + 1}`,
  completed: Math.floor(Math.random() * 20) + 5,
  created: Math.floor(Math.random() * 25) + 8,
  overdue: Math.floor(Math.random() * 5),
}));

// ── auto-refresh toggle ───────────────────────────────────────────

function AutoRefreshToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-2 text-xs text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300 transition-colors"
      aria-pressed={enabled}
    >
      <span className="select-none">Auto-refresh</span>
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
          enabled
            ? 'bg-emerald-500'
            : 'bg-surface-200 dark:bg-surface-700'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${
            enabled ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  );
}

// ── page component ─────────────────────────────────────────────────

export default function ReportsPage() {
  const { state } = useApp();
  const color = useIndustryColor();
  const teams = useTeams();
  const { active, review, done } = useBucketedTasks();
  const atRisk = useAtRiskEmployees(10);
  const tasks = state.tasks;
  const audit = state.audit;

  const [autoRefresh, setAutoRefresh] = useState(true);

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

  // WoW deltas (mock — stable per render via useMemo)
  const deltas = useMemo(
    () => ({
      total: mockDelta(),
      completion: mockDelta(),
      avgDays: mockDelta(),
      overdue: mockDelta(),
      rework: mockDelta(),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
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

  // Bottleneck funnel data
  const bottleneckData = useMemo(() => {
    const now = Date.now();
    const stages: TaskStatus[] = ['Pending Approval', 'Open', 'In Progress', 'Submitted', 'Verified'];
    return stages.map((status) => {
      const inStatus = tasks.filter((t) => t.status === status);
      const count = inStatus.length;
      const totalAgeDays = inStatus.reduce((sum, t) => {
        const created = new Date(t.createdAt).getTime();
        return sum + (now - created) / (1000 * 60 * 60 * 24);
      }, 0);
      const avgAge = count > 0 ? Math.round((totalAgeDays / count) * 10) / 10 : 0;
      return { status, count, avgAge, fill: STATUS_COLORS[status] };
    });
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

  // KPI items with colors for the custom row
  const kpiItems = [
    { label: 'Total Tasks', value: stats.total, color, delta: deltas.total },
    { label: 'Completion', value: stats.completion, color: '#059669', delta: deltas.completion },
    { label: 'Avg Days', value: stats.avgDays, color: '#0ea5e9', delta: deltas.avgDays },
    { label: 'Overdue %', value: stats.overdue, color: '#dc2626', delta: deltas.overdue },
    { label: 'Rework %', value: stats.rework, color: '#d97706', delta: deltas.rework },
  ];

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
          <div className="flex items-center gap-4">
            <AutoRefreshToggle
              enabled={autoRefresh}
              onToggle={() => setAutoRefresh((v) => !v)}
            />
            <ExportButton />
          </div>
        </div>
        <div className="px-5 lg:px-6 pb-2">
          {autoRefresh ? (
            <FreshnessLabel lastUpdated={new Date().toISOString()} isRealtime />
          ) : (
            <FreshnessLabel lastUpdated={new Date().toISOString()} />
          )}
        </div>
      </div>

      <div className="overflow-y-auto">
        <div className="px-5 lg:px-6 pt-5 space-y-6 pb-28 md:pb-8">
          {/* Summary Stats (KPI Row with WoW badges) */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <SectionHeader title="Key Metrics" />
              <FreshnessLabel lastUpdated={new Date().toISOString()} isRealtime />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {kpiItems.map((kpi, i) => (
                <div
                  key={i}
                  className="group relative bg-white dark:bg-surface-900 rounded-xl border border-surface-100 dark:border-surface-800 p-4 text-center transition-all hover:shadow-sm hover:border-surface-200 dark:hover:border-surface-700"
                >
                  <span
                    className="block text-title lg:text-display tabular-nums"
                    style={{ color: kpi.color }}
                  >
                    {kpi.value}
                  </span>
                  <span className="block text-micro lg:text-[11px] text-surface-400 dark:text-surface-500 mt-1 uppercase tracking-wider font-medium">
                    {kpi.label}
                  </span>
                  <div className="mt-1.5">
                    <WoWBadge delta={kpi.delta} />
                  </div>
                  {/* Accent bar */}
                  <div
                    className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full opacity-40"
                    style={{ backgroundColor: kpi.color }}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Task Trends Chart */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <SectionHeader title="Task Trends (8 weeks)" />
              <FreshnessLabel lastUpdated={new Date().toISOString()} isRealtime />
            </div>
            <Card>
              <CardContent className="py-4">
                <RechartsResponsiveContainer width="100%" height={280}>
                  <RechartsLineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="week"
                      tick={{ fontSize: 12 }}
                      stroke="#9ca3af"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="#9ca3af"
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        fontSize: '12px',
                        border: '1px solid #e5e7eb',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Completed"
                    />
                    <Line
                      type="monotone"
                      dataKey="created"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Created"
                    />
                    <Line
                      type="monotone"
                      dataKey="overdue"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Overdue"
                    />
                  </RechartsLineChart>
                </RechartsResponsiveContainer>
              </CardContent>
            </Card>
          </section>

          {/* Bottleneck Analysis */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <SectionHeader title="Bottleneck Analysis" />
            </div>
            <Card>
              <CardContent className="py-4">
                <RechartsResponsiveContainer width="100%" height={280}>
                  <RechartsBarChart
                    data={bottleneckData}
                    layout="vertical"
                    margin={{ top: 5, right: 80, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9ca3af" allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="status"
                      tick={{ fontSize: 11 }}
                      stroke="#9ca3af"
                      width={120}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        fontSize: '12px',
                        border: '1px solid #e5e7eb',
                      }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(value: any, _name: any, props: any) => [
                        `${value} tasks (avg ${props?.payload?.avgAge ?? 0}d)`,
                        'Count',
                      ]}
                    />
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} label={(props: any) => {
                      const { x, y, width, height, value, index } = props;
                      return (
                        <text
                          x={x + width + 6}
                          y={y + height / 2}
                          fill="#6b7280"
                          fontSize={11}
                          dominantBaseline="central"
                        >
                          {value} · avg {bottleneckData[index]?.avgAge ?? 0}d
                        </text>
                      );
                    }}>
                      {bottleneckData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Bar>
                  </RechartsBarChart>
                </RechartsResponsiveContainer>
              </CardContent>
            </Card>
          </section>

          <div className="lg:grid lg:grid-cols-2 lg:gap-6">
            {/* Task Status Breakdown */}
            <section>
              <div className="flex items-center gap-3 mb-3">
                <SectionHeader title="Task Status Breakdown" />
                <FreshnessLabel lastUpdated={new Date().toISOString()} isRealtime />
              </div>
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
              <div className="flex items-center gap-3 mb-3">
                {atRisk.length > 0 ? (
                  <>
                    <SectionHeader title="At-Risk Employees" count={atRisk.length} />
                    <FreshnessLabel lastUpdated={new Date().toISOString()} isRealtime />
                  </>
                ) : (
                  <>
                    <SectionHeader title="At-Risk Employees" />
                    <FreshnessLabel lastUpdated={new Date().toISOString()} isRealtime />
                  </>
                )}
              </div>
              {atRisk.length > 0 ? (
                <AtRiskSection employees={atRisk} limit={10} />
              ) : (
                <Card>
                  <CardContent>
                    <EmptyState
                      icon={Users}
                      title="No at-risk employees"
                      description="All employees are performing within expected thresholds"
                    />
                  </CardContent>
                </Card>
              )}
            </section>
          </div>

          {/* Team Performance */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <SectionHeader title="Team Performance" count={teamRows.length} />
              <FreshnessLabel lastUpdated={new Date().toISOString()} isRealtime />
            </div>
            {teamRows.length > 0 ? (
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
            ) : (
              <Card>
                <CardContent>
                  <EmptyState
                    icon={Users}
                    title="No teams yet"
                    description="Team performance metrics will appear once teams are set up"
                  />
                </CardContent>
              </Card>
            )}
          </section>

          {/* Activity Feed */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <SectionHeader
                title="Recent Activity"
                count={recentAudit.length}
              />
              <FreshnessLabel lastUpdated={new Date().toISOString()} isRealtime />
            </div>
            <Card>
              <CardContent className="py-0">
                {recentAudit.length === 0 ? (
                  <EmptyState
                    icon={Activity}
                    title="No audit activity yet"
                    description="Task updates and approvals will appear here as activity occurs"
                  />
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
