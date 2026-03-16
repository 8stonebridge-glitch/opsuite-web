'use client';

import { useRouter } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';
import { useApp } from '../../../../src/store/AppContext';
import { useCurrentName, useMyTeam, useIndustryColor } from '../../../../src/store/selectors';
import { ThemeSwitcher } from '../../../../src/components/ui/ThemeSwitcher';
import { Card } from '../../../../src/components/ui/Card';
import { Avatar } from '../../../../src/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { RoleSwitcher } from '../../../../src/components/layout/RoleSwitcher';

export default function SubAdminMoreScreen() {
  const { state, dispatch } = useApp();
  const name = useCurrentName();
  const team = useMyTeam();
  const color = useIndustryColor();
  const router = useRouter();
  const { signOut } = useClerk();

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-950 min-h-screen">
      <RoleSwitcher />

      <div className="overflow-y-auto pb-24">
        <div className="px-5 pt-4 space-y-3">
          <Card className="flex flex-col items-center py-6">
            <Avatar name={name} color={team?.color || color} size="lg" />
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-3">{name}</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">{team?.name || 'Team'} Lead</p>
          </Card>

          <Card>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              Org Policy
            </p>
            <SettingRow icon="⏸" label="Stalled alert after" value={`${state.orgSettings.noChangeAlertWorkdays} workdays`} />
            <SettingRow icon="🔄" label="Rework escalation after" value={`${state.orgSettings.reworkAlertCycles} cycles`} last />
          </Card>

          <Card>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              Team
            </p>
            <SettingRow icon="👥" label="Team" value={team?.name || '-'} />
            <SettingRow icon="👤" label="Members" value={String(team?.members.length || 0)} />
            <SettingRow icon="🏢" label="Organization" value={state.onboarding.orgName} last />
          </Card>

          <Card>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
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
            onClick={() => {
              if (window.confirm('Are you sure you want to sign out?')) {
                signOut({ redirectUrl: '/sign-in' });
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
    <div className={`flex gap-3 py-3 items-start ${last ? '' : 'border-b border-gray-100 dark:border-gray-800'}`}>
      <span className="text-base">{icon}</span>
      <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 pr-2 min-w-0">{label}</span>
      <span className="text-sm text-gray-400 dark:text-gray-500 text-right max-w-[46%] shrink">{value}</span>
    </div>
  );
}
