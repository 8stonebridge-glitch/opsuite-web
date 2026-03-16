'use client';

import { useApp } from '../../store/AppContext';
import { Avatar } from '../ui/Avatar';
import { Select } from '../ui/Select';
import {
  useCurrentName,
  useCurrentRoleLabel,
  useIndustryColor,
  useTeams,
} from '../../store/selectors';
import type { Role } from '../../types';
import { useRouter } from 'next/navigation';
import { InboxButton } from '../inbox/InboxButton';
import { Bell, ChevronDown } from 'lucide-react';

export function RoleSwitcher() {
  const { state, dispatch } = useApp();
  const name = useCurrentName();
  const roleLabel = useCurrentRoleLabel();
  const color = useIndustryColor();
  const teams = useTeams();
  const router = useRouter();

  // Non-demo accounts: show minimal header with org name + inbox button
  if (!true) {
    return (
      <div className="bg-white dark:bg-surface-950 px-5 pt-5 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar name={state.onboarding.orgName || 'O'} color={color} />
          <div>
            <span className="block text-heading text-surface-900 dark:text-surface-100">
              {state.onboarding.orgName || 'My Organization'}
            </span>
            <span className="block text-caption text-surface-400 dark:text-surface-500">
              {roleLabel}
              {state.onboarding.industry ? ` · ${state.onboarding.industry.name}` : ''}
            </span>
          </div>
        </div>
        <InboxButton />
      </div>
    );
  }

  const currentValue = `${state.role}|${state.userId || ''}`;

  const options = [
    { label: 'Owner', value: 'admin|' },
    ...teams.flatMap((t) => [
      { label: `${t.lead.name.split(' ')[0]} (${t.name} Lead)`, value: `subadmin|${t.lead.id}` },
      ...t.members.slice(0, 3).map((e) => ({
        label: `${e.name.split(' ')[0]} (${t.name})`,
        value: `employee|${e.id}`,
      })),
    ]),
  ];

  const handleSwitch = (val: string) => {
    const [role, userId] = val.split('|') as [Role, string];
    dispatch({ type: 'SWITCH_USER', role, userId: userId || null });
    // Navigate to appropriate home screen
    setTimeout(() => {
      if (role === 'admin') router.replace('/admin/overview');
      else if (role === 'subadmin') router.replace('/subadmin/overview');
      else router.replace('/employee/my-day');
    }, 50);
  };

  return (
    <div className="bg-white dark:bg-surface-950 px-5 pt-5 pb-4 flex items-center justify-between gap-2 overflow-hidden">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar name={name} color={color} />
        <div className="flex-1 min-w-0">
          <span className="block text-heading text-surface-900 dark:text-surface-100 truncate">
            {state.role === 'admin' ? state.onboarding.orgName : name}
          </span>
          <span className="block text-caption text-surface-400 dark:text-surface-500 truncate">
            {roleLabel}
            {state.onboarding.industry ? ` · ${state.onboarding.industry.name}` : ''}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <InboxButton />
        <div className="max-w-[140px] sm:max-w-[200px]">
          <Select
            placeholder="Switch role"
            options={options}
            value={currentValue}
            onChange={handleSwitch}
          />
        </div>
      </div>
    </div>
  );
}
