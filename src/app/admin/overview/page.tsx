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
} from '../../../../src/store/selectors';
import { RoleSwitcher } from '../../../../src/components/layout/RoleSwitcher';
import { KpiRow } from '../../../../src/components/overview/KpiRow';
import { HealthCard } from '../../../../src/components/overview/HealthCard';
import { AtRiskSection } from '../../../../src/components/performance/AtRiskSection';
import { ScoreBadge } from '../../../../src/components/performance/ScoreBadge';
import { AvailabilityRequestCard } from '../../../../src/components/availability/AvailabilityRequestCard';
import { Card } from '../../../../src/components/ui/Card';
import { Avatar } from '../../../../src/components/ui/Avatar';

export default function OwnerOverviewScreen() {
  const { state } = useApp();
  const color = useIndustryColor();
  const orgMode = useOrgMode();
  const isDirect = orgMode === 'direct';
  const teams = useTeams();
  const { active, review } = useBucketedTasks();
  const { overdue, stalled } = useActiveGroups();
  const atRisk = useAtRiskEmployees(5);
  const pendingRequests = usePendingRequests();
  const awayToday = useAwayToday();
  const coverageNeeded = useCoverageNeeded();

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-950 min-h-screen">
      <RoleSwitcher />

      <div className="overflow-y-auto">
        <div className="px-5 pt-4 space-y-5 pb-24">
          <KpiRow
            items={[
              { label: 'Active', value: active.length, color },
              { label: 'Review', value: review.length, color: '#d97706' },
              { label: 'Overdue', value: overdue.length, color: '#dc2626' },
              { label: 'Stalled', value: stalled.length, color: '#ea580c' },
              ...(awayToday.length > 0 ? [{ label: 'Away', value: awayToday.length, color: '#6366f1' }] : []),
            ]}
          />

          {pendingRequests.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                Pending Requests ({pendingRequests.length})
              </p>
              <div className="space-y-2">
                {pendingRequests.map((r) => (
                  <AvailabilityRequestCard key={r.id} record={r} approverId="admin" />
                ))}
              </div>
            </div>
          )}

          {awayToday.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                Away Today ({awayToday.length})
              </p>
              <Card>
                {awayToday.map((emp, i) => (
                  <div
                    key={emp.id}
                    className={`flex items-center gap-3 py-2.5 ${i < awayToday.length - 1 ? 'border-b border-gray-50 dark:border-gray-800' : ''}`}
                  >
                    <Avatar name={emp.name} color={emp.teamId ? '#6366f1' : '#9ca3af'} size="sm" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{emp.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{emp.teamName || 'Direct report'}</p>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          )}

          {coverageNeeded.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                Coverage Needed ({coverageNeeded.length})
              </p>
              <Card>
                {coverageNeeded.slice(0, 5).map((task, i) => (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 py-2.5 ${i < Math.min(coverageNeeded.length, 5) - 1 ? 'border-b border-gray-50 dark:border-gray-800' : ''}`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-gray-100 truncate">{task.title}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{task.site} · {task.assignee}</p>
                    </div>
                    <div className="px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950">
                      <span className="text-[10px] font-semibold text-orange-600 dark:text-orange-400">Coverage</span>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
              {state.onboarding.industry?.sitesLabel || 'Sites'}
            </p>
            <div className="space-y-2">
              {state.onboarding.sites.map((site) => (
                <SiteHealthRow key={site.id} siteId={site.id} siteName={site.name} />
              ))}
            </div>
          </div>

          {!isDirect && teams.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                Teams
              </p>
              <div className="space-y-2">
                {teams.map((team) => (
                  <TeamHealthRow key={team.id} teamId={team.id} teamName={team.name} teamColor={team.color} leadName={team.lead.name} memberCount={team.members.length + 1} />
                ))}
              </div>
            </div>
          )}

          <AtRiskSection employees={atRisk} limit={5} />
        </div>
      </div>
    </div>
  );
}

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
