'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';
import { useApp } from '../../../../src/store/AppContext';
import { useCurrentName, useMyTeam, useIndustryColor, useCheckInStats, useAvailability } from '../../../../src/store/selectors';
import { getToday, getNowISO } from '../../../../src/utils/date';
import { uid } from '../../../../src/utils/id';
import { useTheme } from '../../../../src/providers/ThemeProvider';
import { ThemeSwitcher } from '../../../../src/components/ui/ThemeSwitcher';
import { Card } from '../../../../src/components/ui/Card';
import { Avatar } from '../../../../src/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { LeaveRequestSheet } from '../../../../src/components/availability/LeaveRequestSheet';
import { AvailabilityHistory } from '../../../../src/components/availability/AvailabilityHistory';

export default function EmployeeMoreScreen() {
  const { state, dispatch } = useApp();
  const name = useCurrentName();
  const team = useMyTeam();
  const color = useIndustryColor();
  const stats = useCheckInStats();
  const availability = useAvailability();
  const router = useRouter();
  const { signOut } = useClerk();
  const [showLeaveSheet, setShowLeaveSheet] = useState(false);
  const [isSubmittingSick, setIsSubmittingSick] = useState(false);
  const { isDark } = useTheme();
  const today = getToday();

  const hasAvailabilityToday = state.availability.some(
    (r) =>
      r.memberId === state.userId &&
      r.startDate <= today &&
      r.endDate >= today &&
      r.status !== 'cancelled' &&
      r.status !== 'rejected'
  );

  const handleReportSick = async () => {
    if (!state.userId || !state.activeWorkspaceId) return;
    dispatch({
      type: 'REQUEST_AVAILABILITY',
      record: {
        id: uid(),
        organizationId: state.activeWorkspaceId,
        memberId: state.userId,
        type: 'sick',
        status: 'pending',
        startDate: today,
        endDate: today,
        notes: 'Reported sick',
        requestedById: state.userId,
        approvedById: null,
        createdAt: getNowISO(),
        approvedAt: null,
      },
    });
  };

  const completedCount = state.tasks.filter(
    (t) => t.assigneeId === state.userId && (t.status === 'Completed' || t.status === 'Verified')
  ).length;

  const myRecords = availability.filter((r) => r.memberId === state.userId);

  return (
    <div className="flex-1 bg-surface-50 dark:bg-surface-950 min-h-screen">
      <div className="overflow-y-auto pb-24">
        <div className="px-5 pt-4 space-y-3">
          <Card className="flex flex-col items-center py-6">
            <Avatar name={name} color={team?.color || color} size="lg" />
            <p className="text-title text-surface-900 dark:text-surface-100 mt-3">{name}</p>
            <p className="text-body text-surface-400 dark:text-surface-500">{team?.name || 'Team'}</p>
          </Card>

          <Card>
            <p className="text-micro font-semibold text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2">
              Availability
            </p>
            {!hasAvailabilityToday && (
              <button
                onClick={() => void handleReportSick()}
                disabled={isSubmittingSick}
                className="flex items-center gap-3 py-3 border-b border-surface-100 dark:border-surface-800 w-full"
              >
                <span className="text-body">🏥</span>
                <span className="text-body text-surface-700 dark:text-surface-300 flex-1 text-left">
                  {isSubmittingSick ? 'Reporting Sick...' : 'Report Sick Today'}
                </span>
                <span className="text-surface-300 dark:text-surface-600">&rsaquo;</span>
              </button>
            )}
            <button
              onClick={() => setShowLeaveSheet(true)}
              className="flex items-center gap-3 py-3 border-b border-surface-100 dark:border-surface-800 w-full"
            >
              <span className="text-body">✈️</span>
              <span className="text-body text-surface-700 dark:text-surface-300 flex-1 text-left">Request Leave</span>
              <span className="text-surface-300 dark:text-surface-600">&rsaquo;</span>
            </button>
            <div className="mt-2">
              <AvailabilityHistory records={myRecords} />
            </div>
          </Card>

          <Card>
            <p className="text-micro font-semibold text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2">
              Org Policy
            </p>
            <SettingRow icon="⏸" label="Stalled alert after" value={`${state.orgSettings.noChangeAlertWorkdays} workdays`} />
            <SettingRow icon="🔄" label="Rework escalation after" value={`${state.orgSettings.reworkAlertCycles} cycles`} last />
          </Card>

          <Card>
            <p className="text-micro font-semibold text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2">
              Personal
            </p>
            <SettingRow icon="🔥" label="Current Streak" value={`${stats.currentStreak} days`} />
            <SettingRow icon="✅" label="Tasks Completed" value={String(completedCount)} />
            <SettingRow icon="🏢" label="Organization" value={state.onboarding.orgName} last />
          </Card>

          <Card>
            <p className="text-micro font-semibold text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2">
              App Settings
            </p>
            <SettingRow icon="🔔" label="Notifications" value="Coming soon" last />
          </Card>

          <Card>
            <ThemeSwitcher />
          </Card>

          <Card>
            <SettingRow icon="ℹ️" label="Version" value="1.0.0" last />
          </Card>

          <Button
            variant="outline"
            onClick={async () => {
              if (window.confirm('Are you sure you want to sign out?')) {
                await signOut();
                window.location.href = '/sign-in';
              }
            }}
          >Sign Out</Button>
        </div>
      </div>

      <LeaveRequestSheet visible={showLeaveSheet} onClose={() => setShowLeaveSheet(false)} />
    </div>
  );
}

function SettingRow({ icon, label, value, last }: { icon: string; label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex gap-3 py-3 items-start ${last ? '' : 'border-b border-surface-100 dark:border-surface-800'}`}>
      <span className="text-body">{icon}</span>
      <span className="text-body text-surface-700 dark:text-surface-300 flex-1 pr-2 min-w-0">{label}</span>
      <span className="text-caption text-surface-400 dark:text-surface-500 text-right max-w-[46%] shrink truncate">{value}</span>
    </div>
  );
}
