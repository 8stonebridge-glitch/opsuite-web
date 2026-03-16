'use client';

import { useApp } from '../../../../src/store/AppContext';
import {
  useBucketedTasks,
  useActiveGroups,
  useSiteHealth,
  useTeamHealth,
  useIndustryColor,
  useAtRiskEmployees,
  useSubadminPerformance,
  useTeams,
  useOrgMode,
  usePendingRequests,
  useAwayToday,
  useCoverageNeeded,
  useCurrentName,
} from '../../../../src/store/selectors';
import { KpiRow } from '../../../../src/components/overview/KpiRow';
import { HealthCard } from '../../../../src/components/overview/HealthCard';
import { AtRiskSection } from '../../../../src/components/performance/AtRiskSection';
import { ScoreBadge } from '../../../../src/components/performance/ScoreBadge';
import { AvailabilityRequestCard } from '../../../../src/components/availability/AvailabilityRequestCard';
import { Card, CardContent } from '../../../../src/components/ui/Card';
import { Avatar } from '../../../../src/components/ui/Avatar';
import { useSession } from '../../../../src/providers/SessionProvider';
import { Activity, TrendingUp, AlertTriangle, Clock } from 'lucide-react';

export default function OwnerOverviewScreen() {
  const { state } = useApp();
  const color = useIndustryColor();
  const { user: sessionUser } = useSession();
  const demoName = useCurrentName();
  // Prefer actual Clerk user name over seed data name
  const name = sessionUser?.name || demoName;
  const orgMode = useOrgMode();
  const isDirect = orgMode === 'direct';
  const teams = useTeams();
  const { active, review, done } = useBucketedTasks();
  const { overdue, stalled } = useActiveGroups();
  const atRisk = useAtRiskEmployees(5);
  const pendingRequests = usePendingRequests();
  const awayToday = useAwayToday();
  const coverageNeeded = useCoverageNeeded();

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="flex-1 bg-surface-50 dark:bg-surface-950 min-h-screen">
      {/* Page Header */}
      <div className="bg-white dark:bg-surface-900 border-b border-surface-100 dark:border-surface-800">
        <div className="px-5 lg:px-6 py-5 lg:py-6">
          <p className="text-caption text-surface-400 dark:text-surface-500">{greeting},</p>
          <h1 className="text-xl lg:text-title text-surface-900 dark:text-surface-100 mt-0.5">
            {name}
          </h1>
          <p className="text-caption text-surface-400 dark:text-surface-500 mt-1">
            {state.onboarding.orgName}
            {state.onboarding.industry ? ` \u00b7 ${state.onboarding.industry.name}` : ''}
          </p>
        </div>
      </div>

      <div className="overflow-y-auto">
        <div className="px-5 lg:px-6 pt-5 space-y-6 pb-28 md:pb-8">
          {/* KPI Summary */}
          <KpiRow
            items={[
              { label: 'Active', value: active.length, color },
              { label: 'Review', value: review.length, color: '#d97706' },
              { label: 'Overdue', value: overdue.length, color: '#dc2626' },
              { label: 'Stalled', value: stalled.length, color: '#ea580c' },
              ...(awayToday.length > 0 ? [{ label: 'Away', value: awayToday.length, color: '#6366f1' }] : []),
            ]}
          />

          <div className="lg:grid lg:grid-cols-[1fr,360px] lg:gap-8">
            {/* Main Column */}
            <div className="space-y-6">
              {/* Sites */}
              <section>
                <SectionHeader
                  title={state.onboarding.industry?.sitesLabel || 'Teams'}
                  count={state.onboarding.sites.length}
                />
                <div className="space-y-3">
                  {state.onboarding.sites.map((site) => (
                    <SiteHealthRow key={site.id} siteId={site.id} siteName={site.name} />
                  ))}
                  {state.onboarding.sites.length === 0 && (
                    <Card>
                      <CardContent className="py-6 text-center">
                        <p className="text-caption text-surface-400 dark:text-surface-500">No sites configured yet</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </section>

              {/* Teams */}
              {!isDirect && teams.length > 0 && (
                <section>
                  <SectionHeader title="Teams" count={teams.length} />
                  <div className="space-y-3">
                    {teams.map((team) => (
                      <TeamHealthRow
                        key={team.id}
                        teamId={team.id}
                        teamName={team.name}
                        teamColor={team.color}
                        leadName={team.lead.name}
                        memberCount={team.members.length + 1}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* At-Risk Employees */}
              {atRisk.length > 0 && (
                <section>
                  <AtRiskSection employees={atRisk} limit={5} />
                </section>
              )}
            </div>

            {/* Right Sidebar Column */}
            <div className="space-y-6 mt-6 lg:mt-0">
              {/* Pending Requests */}
              {pendingRequests.length > 0 && (
                <section>
                  <SectionHeader
                    title="Pending Requests"
                    count={pendingRequests.length}
                    accentColor="#d97706"
                  />
                  <div className="space-y-3">
                    {pendingRequests.map((r) => (
                      <AvailabilityRequestCard key={r.id} record={r} approverId="admin" />
                    ))}
                  </div>
                </section>
              )}

              {/* Away Today */}
              {awayToday.length > 0 && (
                <section>
                  <SectionHeader
                    title="Away Today"
                    count={awayToday.length}
                    accentColor="#6366f1"
                  />
                  <Card>
                    <CardContent className="py-0">
                      {awayToday.map((emp, i) => (
                        <div
                          key={emp.id}
                          className={`flex items-center gap-3 py-3 ${
                            i < awayToday.length - 1
                              ? 'border-b border-surface-100 dark:border-surface-800'
                              : ''
                          }`}
                        >
                          <Avatar name={emp.name} color={emp.teamId ? '#6366f1' : '#9ca3af'} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-caption font-medium text-surface-900 dark:text-surface-100 truncate">
                              {emp.name}
                            </p>
                            <p className="text-caption text-surface-400 dark:text-surface-500 truncate">
                              {emp.teamName || 'Direct report'}
                            </p>
                          </div>
                          <div className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950">
                            <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">Away</span>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </section>
              )}

              {/* Coverage Needed */}
              {coverageNeeded.length > 0 && (
                <section>
                  <SectionHeader
                    title="Coverage Needed"
                    count={coverageNeeded.length}
                    accentColor="#ea580c"
                  />
                  <Card>
                    <CardContent className="py-0">
                      {coverageNeeded.slice(0, 5).map((task, i) => (
                        <div
                          key={task.id}
                          className={`flex items-center gap-3 py-3 ${
                            i < Math.min(coverageNeeded.length, 5) - 1
                              ? 'border-b border-surface-100 dark:border-surface-800'
                              : ''
                          }`}
                        >
                          <div className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-caption text-surface-900 dark:text-surface-100 truncate">{task.title}</p>
                            <p className="text-caption text-surface-400 dark:text-surface-500">
                              {task.site} · {task.assignee}
                            </p>
                          </div>
                          <div className="px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950 shrink-0">
                            <span className="text-[10px] font-semibold text-orange-600 dark:text-orange-400">
                              Coverage
                            </span>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </section>
              )}

              {/* Quick Stats Summary */}
              <section>
                <SectionHeader title="Summary" />
                <Card>
                  <CardContent className="py-0">
                    <QuickStat
                      icon={<Activity className="size-4 text-blue-500" />}
                      label="Active tasks"
                      value={active.length}
                      border
                    />
                    <QuickStat
                      icon={<TrendingUp className="size-4 text-emerald-500" />}
                      label="Completed"
                      value={done.length}
                      border
                    />
                    <QuickStat
                      icon={<AlertTriangle className="size-4 text-red-500" />}
                      label="Overdue"
                      value={overdue.length}
                      border
                    />
                    <QuickStat
                      icon={<Clock className="size-4 text-orange-500" />}
                      label="Stalled"
                      value={stalled.length}
                    />
                  </CardContent>
                </Card>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Section Header ─── */
function SectionHeader({
  title,
  count,
  accentColor,
}: {
  title: string;
  count?: number;
  accentColor?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {accentColor && (
        <div
          className="w-1.5 h-4 rounded-full"
          style={{ backgroundColor: accentColor }}
        />
      )}
      <h2 className="text-caption font-semibold text-surface-400 dark:text-surface-500 uppercase tracking-wider">
        {title}
      </h2>
      {count !== undefined && (
        <span className="text-caption font-medium text-surface-300 dark:text-surface-600">
          {count}
        </span>
      )}
    </div>
  );
}

/* ─── Quick Stat Row ─── */
function QuickStat({
  icon,
  label,
  value,
  border,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  border?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 py-3 ${
        border ? 'border-b border-surface-100 dark:border-surface-800' : ''
      }`}
    >
      {icon}
      <span className="text-caption text-surface-600 dark:text-surface-400 flex-1">{label}</span>
      <span className="text-caption font-semibold text-surface-900 dark:text-surface-100">{value}</span>
    </div>
  );
}

/* ─── Site Health Row ─── */
function SiteHealthRow({ siteId, siteName }: { siteId: string; siteName: string }) {
  const health = useSiteHealth(siteId);
  return (
    <HealthCard
      title={siteName}
      icon="location"
      iconColor="#6366f1"
      stats={[
        { label: 'Active', value: health.totalActive, color: '#3b82f6' },
        { label: 'Overdue', value: health.overdue, color: '#dc2626' },
        { label: 'Review', value: health.review, color: '#d97706' },
        { label: 'Check-in', value: `${health.checkInRate}%`, color: '#059669' },
      ]}
    />
  );
}

/* ─── Team Health Row ─── */
function TeamHealthRow({
  teamId,
  teamName,
  teamColor,
  leadName,
  memberCount,
}: {
  teamId: string;
  teamName: string;
  teamColor: string;
  leadName: string;
  memberCount: number;
}) {
  const health = useTeamHealth(teamId);
  const teamPerf = useSubadminPerformance(teamId);
  return (
    <HealthCard
      title={teamName}
      subtitle={`${leadName} · ${memberCount} ${memberCount === 1 ? 'person' : 'people'}`}
      icon="people"
      iconColor={teamColor}
      stats={[
        { label: 'Active', value: health.totalActive, color: '#3b82f6' },
        { label: 'Overdue', value: health.overdue, color: '#dc2626' },
        { label: 'Review', value: health.review, color: '#d97706' },
        { label: 'Done/wk', value: health.completedThisWeek, color: '#059669' },
      ]}
      rightContent={
        <ScoreBadge score={teamPerf.score} band={teamPerf.band} size="sm" />
      }
    />
  );
}
