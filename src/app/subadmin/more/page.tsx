'use client';

import { useRouter } from 'next/navigation';
import { useAuthActions } from '@convex-dev/auth/react';
import { useApp } from '@/store/AppContext';
import { useCurrentName, useMyTeam, useIndustryColor } from '@/store/selectors';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { NotificationPreferences } from '@/components/notifications/NotificationPreferences';

export default function SubAdminMoreScreen() {
  const { state, dispatch } = useApp();
  const name = useCurrentName();
  const team = useMyTeam();
  const color = useIndustryColor();
  const router = useRouter();
  const { signOut } = useAuthActions();

  return (
    <div className="flex-1 bg-surface-50 dark:bg-surface-950 min-h-screen">
      <div className="overflow-y-auto pb-24">
        <div className="px-5 pt-4 space-y-3">
          <Card className="flex flex-col items-center py-6">
            <Avatar name={name} color={team?.color || color} size="lg" />
            <p className="text-title text-surface-900 dark:text-surface-100 mt-3">{name}</p>
            <p className="text-caption text-surface-400 dark:text-surface-500">{team?.name || 'Team'} Lead</p>
          </Card>

          <Card>
            <p className="text-caption text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2">
              Org Policy
            </p>
            <SettingRow icon="⏸" label="Stalled alert after" value={`${state.orgSettings.noChangeAlertWorkdays} workdays`} />
            <SettingRow icon="🔄" label="Rework escalation after" value={`${state.orgSettings.reworkAlertCycles} cycles`} last />
          </Card>

          <Card>
            <p className="text-caption text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2">
              Team
            </p>
            <SettingRow icon="👥" label="Team" value={team?.name || '-'} />
            <SettingRow icon="👤" label="Members" value={String(team?.members.length || 0)} />
            <SettingRow icon="🏢" label="Organization" value={state.onboarding.orgName} last />
          </Card>

          <Card>
            <p className="text-caption text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2">
              App Settings
            </p>
            <SettingRow icon="🔔" label="Notifications" value="Coming soon" last />
          </Card>

          <Card>
            <ThemeSwitcher />
          </Card>

          <NotificationPreferences />

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
    </div>
  );
}

function SettingRow({ icon, label, value, last }: { icon: string; label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex gap-3 py-3 items-start ${last ? '' : 'border-b border-surface-100 dark:border-surface-800'}`}>
      <span className="text-body">{icon}</span>
      <span className="text-body text-surface-700 dark:text-surface-300 flex-1 pr-2 min-w-0">{label}</span>
      <span className="text-body text-surface-400 dark:text-surface-500 text-right max-w-[46%] shrink truncate">{value}</span>
    </div>
  );
}
