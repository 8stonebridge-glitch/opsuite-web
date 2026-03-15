'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../../../../src/store/AppContext';
import { useIndustryColor, useTeams, useAllEmployees, useOrgMode, useSitesLabel } from '../../../../src/store/selectors';
import { useTheme } from '../../../../src/providers/ThemeProvider';
import { ThemeSwitcher } from '../../../../src/components/ui/ThemeSwitcher';
import { Card } from '../../../../src/components/ui/Card';
import { Avatar } from '../../../../src/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { RoleSwitcher } from '../../../../src/components/layout/RoleSwitcher';
import { OrgSwitcher } from '../../../../src/components/layout/OrgSwitcher';
import { uid } from '../../../../src/utils/id';

export default function OwnerMoreScreen() {
  const { state, dispatch } = useApp();
  const color = useIndustryColor();
  const { isDark } = useTheme();
  const teams = useTeams();
  const allEmployees = useAllEmployees();
  const orgMode = useOrgMode();
  const sitesLabel = useSitesLabel();
  const router = useRouter();

  const [showCreateSite, setShowCreateSite] = useState(false);
  const [siteName, setSiteName] = useState('');
  const [siteCode, setSiteCode] = useState('');
  const [siteError, setSiteError] = useState('');
  const [isSavingSite, setIsSavingSite] = useState(false);

  const handleCreateSite = async () => {
    const trimmedName = siteName.trim();
    const trimmedCode = siteCode.trim();

    if (trimmedName.length < 2) {
      setSiteError('Enter a site name with at least 2 characters.');
      return;
    }

    setSiteError('');
    setIsSavingSite(true);

    try {
      dispatch({
        type: 'ADD_SITE',
        site: {
          id: uid(),
          name: trimmedName,
        },
      });

      setSiteName('');
      setSiteCode('');
      setShowCreateSite(false);
    } catch (error) {
      setSiteError(error instanceof Error ? error.message : 'We could not create that site yet.');
    } finally {
      setIsSavingSite(false);
    }
  };

  const adjustSetting = (key: 'noChangeAlertWorkdays' | 'reworkAlertCycles', delta: number) => {
    const current = state.orgSettings[key];
    const newVal = Math.max(1, Math.min(10, current + delta));
    dispatch({ type: 'SET_ORG_SETTINGS', settings: { [key]: newVal } });
  };

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-950 min-h-screen">
      <RoleSwitcher />

      <div className="overflow-y-auto pb-24">
        <div className="px-5 pt-4 space-y-3">
          <Card className="flex flex-col items-center py-6">
            <Avatar name={state.onboarding.adminName || 'A'} color={color} size="lg" />
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-3">
              {state.onboarding.adminName || 'Admin'}
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">Owner</p>
          </Card>

          <OrgSwitcher />

          <Card>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
              Operational Rules
            </p>
            <StepperRow
              icon="⏸"
              label="Stalled alert after"
              value={state.orgSettings.noChangeAlertWorkdays}
              unit="workdays"
              onMinus={() => adjustSetting('noChangeAlertWorkdays', -1)}
              onPlus={() => adjustSetting('noChangeAlertWorkdays', 1)}
              color={color}
            />
            <StepperRow
              icon="🔄"
              label="Rework escalation after"
              value={state.orgSettings.reworkAlertCycles}
              unit="cycles"
              onMinus={() => adjustSetting('reworkAlertCycles', -1)}
              onPlus={() => adjustSetting('reworkAlertCycles', 1)}
              color={color}
              last
            />
          </Card>

          <Card>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              Organization
            </p>
            <SettingRow icon="🏢" label="Org Name" value={state.onboarding.orgName} />
            <SettingRow icon="💼" label="Industry" value={state.onboarding.industry?.name || '-'} />
            <div className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-800">
              <span className="text-base">📍</span>
              <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                {sitesLabel}
              </span>
              <span className="text-sm text-gray-400 dark:text-gray-500 mr-2">
                {state.onboarding.sites.length} configured
              </span>
              <button
                onClick={() => setShowCreateSite(true)}
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ backgroundColor: color + '18' }}
              >
                <span style={{ color }} className="text-sm">+</span>
              </button>
            </div>
            <SettingRow icon="👥" label="Teams" value={String(teams.length)} />
            <SettingRow icon="👤" label="Employees" value={String(allEmployees.length)} />
            <SettingRow icon="📋" label="Total Tasks" value={String(state.tasks.length)} />

            <div className="flex items-center gap-3 py-3">
              <span className="text-base">🔀</span>
              <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">Org Mode</span>
              <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    if (orgMode === 'managed') return;
                    dispatch({ type: 'SET_ORG_MODE', mode: 'managed' });
                  }}
                  className={`px-3 py-1.5 ${orgMode === 'managed' ? 'bg-gray-900 dark:bg-gray-100' : 'bg-gray-50 dark:bg-gray-800'}`}
                >
                  <span className={`text-xs font-semibold ${orgMode === 'managed' ? 'text-white dark:text-gray-900' : 'text-gray-500 dark:text-gray-400'}`}>
                    Managed
                  </span>
                </button>
                <button
                  onClick={() => {
                    if (orgMode === 'direct') return;
                    dispatch({ type: 'SET_ORG_MODE', mode: 'direct' });
                  }}
                  className={`px-3 py-1.5 ${orgMode === 'direct' ? 'bg-gray-900 dark:bg-gray-100' : 'bg-gray-50 dark:bg-gray-800'}`}
                >
                  <span className={`text-xs font-semibold ${orgMode === 'direct' ? 'text-white dark:text-gray-900' : 'text-gray-500 dark:text-gray-400'}`}>
                    Direct
                  </span>
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 -mt-1 ml-8 mb-1">
              {orgMode === 'managed' ? 'Teams with subadmin leads' : 'Admin manages employees directly'}
            </p>
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

                router.replace('/');
              }
            }}
          >Sign Out</Button>
        </div>
      </div>

      {/* Create Site Modal */}
      {showCreateSite && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="fixed inset-0 bg-black/30" onClick={() => setShowCreateSite(false)} />
          <div className="relative bg-white dark:bg-gray-950 rounded-t-3xl md:rounded-3xl px-5 pt-5 pb-10 w-full md:max-w-lg">
            <div className="flex items-center justify-between mb-5">
              <p className="text-base font-bold text-gray-900 dark:text-gray-100">Add Site</p>
              <button onClick={() => setShowCreateSite(false)} className="text-gray-500 text-xl">&times;</button>
            </div>

            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              Site Name
            </p>
            <input
              className="w-full bg-gray-50 dark:bg-gray-900 rounded-2xl px-4 py-3.5 text-base text-gray-900 dark:text-gray-100 mb-4 outline-none"
              placeholder="Victoria Hub"
              value={siteName}
              onChange={(e) => {
                setSiteName(e.target.value);
                setSiteError('');
              }}
            />

            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              Site Code (optional)
            </p>
            <input
              className="w-full bg-gray-50 dark:bg-gray-900 rounded-2xl px-4 py-3.5 text-base text-gray-900 dark:text-gray-100 mb-4 outline-none uppercase"
              placeholder="VIC-HUB"
              value={siteCode}
              onChange={(e) => {
                setSiteCode(e.target.value);
                setSiteError('');
              }}
            />

            {siteError ? (
              <p className="text-sm text-red-600 mb-4">{siteError}</p>
            ) : null}

            <Button
              onClick={() => void handleCreateSite()}
              disabled={isSavingSite}
              style={{ backgroundColor: color }}
            >{isSavingSite ? 'Creating site...' : 'Create Site'}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingRow({
  icon,
  label,
  value,
  last,
}: {
  icon: string;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex gap-3 py-3 items-start ${last ? '' : 'border-b border-gray-100 dark:border-gray-800'}`}
    >
      <span className="text-base">{icon}</span>
      <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 pr-2 min-w-0">
        {label}
      </span>
      <span
        className="text-sm text-gray-400 dark:text-gray-500 text-right max-w-[46%] shrink"
      >
        {value}
      </span>
    </div>
  );
}

function StepperRow({
  icon,
  label,
  value,
  unit,
  onMinus,
  onPlus,
  color,
  last,
}: {
  icon: string;
  label: string;
  value: number;
  unit: string;
  onMinus: () => void;
  onPlus: () => void;
  color: string;
  last?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 py-3 ${last ? '' : 'border-b border-gray-100 dark:border-gray-800'}`}>
      <span className="text-base" style={{ color }}>{icon}</span>
      <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={onMinus}
          className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 text-lg"
        >
          -
        </button>
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 min-w-[3rem] text-center px-1">
          {value} {unit === 'workdays' ? 'd' : unit === 'cycles' ? 'x' : unit}
        </span>
        <button
          onClick={onPlus}
          className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 text-lg"
        >
          +
        </button>
      </div>
    </div>
  );
}
