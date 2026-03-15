'use client';

import { useParams, useRouter } from 'next/navigation';
import { useApp } from '../../../../../src/store/AppContext';
import { useSiteTasks, useSiteHealth, useCheckInHealth, useIndustryColor, useTeams } from '../../../../../src/store/selectors';
import { isOverdue } from '../../../../../src/utils/date';
import { TaskPreviewSection } from '../../../../../src/components/overview/TaskPreviewSection';
import { Card } from '../../../../../src/components/ui/Card';
import { Avatar } from '../../../../../src/components/ui/Avatar';
import { useTheme } from '../../../../../src/providers/ThemeProvider';

export default function SiteDetailScreen() {
  const { siteId } = useParams<{ siteId: string }>();
  const { state } = useApp();
  const router = useRouter();
  const color = useIndustryColor();
  const { isDark } = useTheme();

  const teams = useTeams();
  const site = state.onboarding.sites.find((s) => s.id === siteId);
  const siteTasks = useSiteTasks(siteId!);
  const health = useSiteHealth(siteId!);

  const active = siteTasks.filter((t) => t.status === 'Open' || t.status === 'In Progress');
  const review = siteTasks.filter((t) => t.status === 'Pending Approval' || t.status === 'Completed');
  const done = siteTasks.filter((t) => t.status === 'Verified');

  const teamIdsAtSite = [...new Set(siteTasks.map((t) => t.teamId))];
  const teamsAtSite = teams.filter((t) => teamIdsAtSite.includes(t.id));

  const empIdsAtSite = [...new Set(siteTasks.map((t) => t.assigneeId))];
  const checkInHealth = useCheckInHealth(empIdsAtSite);

  const handleTaskPress = (taskId: string) => {
    router.push(`/admin/tasks/${taskId}`);
  };

  if (!site) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <p className="text-gray-400 dark:text-gray-500">Site not found</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-950 min-h-screen">
      {/* Header */}
      <div className="flex items-center px-5 py-3 gap-3">
        <button onClick={() => router.back()} className="text-gray-700 dark:text-gray-300">
          &larr;
        </button>
        <div className="flex-1">
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{site.name}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{siteTasks.length} total tasks</p>
        </div>
      </div>

      <div className="overflow-y-auto pb-24">
        {/* Health Summary */}
        <div className="px-5 pt-2 pb-4">
          <div className="flex gap-2">
            <StatPill label="Active" value={health.totalActive} color="#3b82f6" />
            <StatPill label="Overdue" value={health.overdue} color="#dc2626" />
            <StatPill label="Review" value={health.review} color="#d97706" />
            <StatPill label="Check-in" value={`${health.checkInRate}%`} color="#059669" />
          </div>
        </div>

        {/* Task Sections */}
        <div className="px-5">
          <TaskPreviewSection
            title="Active"
            tasks={active}
            limit={7}
            onTaskPress={handleTaskPress}
            titleColor="#3b82f6"
            icon="flash"
            iconColor="#3b82f6"
          />

          <TaskPreviewSection
            title="Review"
            tasks={review}
            limit={5}
            onTaskPress={handleTaskPress}
            titleColor="#d97706"
            icon="eye"
            iconColor="#d97706"
          />

          <TaskPreviewSection
            title="Done"
            tasks={done}
            limit={5}
            onTaskPress={handleTaskPress}
            titleColor="#059669"
            icon="checkmark-circle"
            iconColor="#059669"
          />

          {siteTasks.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-gray-400 dark:text-gray-500">No tasks at this site</p>
            </div>
          )}
        </div>

        {/* Teams at this Site */}
        {teamsAtSite.length > 0 && (
          <div className="px-5 mt-2">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
              Teams at this site
            </p>
            <Card>
              {teamsAtSite.map((team, idx) => {
                const teamTasksHere = siteTasks.filter((t) => t.teamId === team.id);
                const activeHere = teamTasksHere.filter(
                  (t) => t.status === 'Open' || t.status === 'In Progress'
                ).length;
                const overdueHere = teamTasksHere.filter((t) => isOverdue(t.due, t.status)).length;

                return (
                  <div
                    key={team.id}
                    className={`flex items-center py-3 gap-3 ${
                      idx < teamsAtSite.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''
                    }`}
                  >
                    <Avatar name={team.name} color={team.color} size="sm" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{team.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {teamTasksHere.length} tasks · {activeHere} active
                        {overdueHere > 0 ? ` · ${overdueHere} overdue` : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>
        )}

        {/* Check-in Overview */}
        <div className="px-5 mt-4">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            Check-in Overview
          </p>
          <Card>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#05966915' }}
              >
                <span className="text-lg">👥</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {checkInHealth.checkedInToday} of {checkInHealth.total} checked in
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Today&apos;s check-in rate</p>
              </div>
              <p className="text-lg font-bold" style={{ color: '#059669' }}>
                {checkInHealth.rate}%
              </p>
            </div>
            {/* Progress bar */}
            <div className="mt-3 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  backgroundColor: '#059669',
                  width: `${checkInHealth.rate}%`,
                }}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div
      className="flex-1 flex flex-col items-center py-2 rounded-lg"
      style={{ backgroundColor: color + '10' }}
    >
      <p className="text-base font-bold" style={{ color }}>
        {value}
      </p>
      <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500">{label}</p>
    </div>
  );
}
