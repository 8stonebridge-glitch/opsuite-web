'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';
import { useApp } from '../../../../src/store/AppContext';
import { useIndustryColor, useTeams, useAllEmployees, useOrgMode, useSitesLabel } from '../../../../src/store/selectors';
import { useSession } from '../../../../src/providers/SessionProvider';
import { useTheme } from '../../../../src/providers/ThemeProvider';
import { ThemeSwitcher } from '../../../../src/components/ui/ThemeSwitcher';
import { Card, CardContent } from '../../../../src/components/ui/Card';
import { Avatar } from '../../../../src/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { OrgSwitcher } from '../../../../src/components/layout/OrgSwitcher';
import { uid } from '../../../../src/utils/id';
import {
  Building2,
  Briefcase,
  MapPin,
  Users,
  User,
  ClipboardList,
  Shuffle,
  Bell,
  Info,
  Pause,
  RefreshCw,
  LogOut,
  Plus,
  ChevronRight,
} from 'lucide-react';

export default function OwnerMoreScreen() {
  const { state, dispatch } = useApp();
  const color = useIndustryColor();
  const { isDark } = useTheme();
  const teams = useTeams();
  const allEmployees = useAllEmployees();
  const orgMode = useOrgMode();
  const sitesLabel = useSitesLabel();
  const router = useRouter();
  const { signOut } = useClerk();
  const { user } = useSession();

  const [showCreateSite, setShowCreateSite] = useState(false);
  const [siteName, setSiteName] = useState('');
  const [siteCode, setSiteCode] = useState('');
  const [siteError, setSiteError] = useState('');
  const [isSavingSite, setIsSavingSite] = useState(false);

  const handleCreateSite = async () => {
    const trimmedName = siteName.trim();

    if (trimmedName.length < 2) {
      setSiteError('Enter a team name with at least 2 characters.');
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
      setSiteError(error instanceof Error ? error.message : 'We could not create that team yet.');
    } finally {
      setIsSavingSite(false);
    }
  };

  const adjustSetting = (key: 'noChangeAlertWorkdays' | 'reworkAlertCycles', delta: number) => {
    const current = state.orgSettings[key];
    const newVal = Math.max(1, Math.min(10, current + delta));
    dispatch({ type: 'SET_ORG_SETTINGS', settings: { [key]: newVal } });
  };

  const displayName = user?.name || state.onboarding.adminName || 'Admin';
  const displayEmail = user?.email || '';

  return (
    <div className="flex-1 bg-surface-50 dark:bg-surface-950 min-h-screen">
      <div className="overflow-y-auto pb-28 md:pb-8">
        <div className="px-5 lg:px-6 pt-5 space-y-4 max-w-2xl mx-auto">

          {/* Profile Card */}
          <Card>
            <CardContent className="py-2">
              <div className="flex items-center gap-4">
                <Avatar name={displayName} color={color} size="lg" />
                <div className="flex-1 min-w-0">
                  <p className="text-title text-surface-900 dark:text-surface-100 truncate">
                    {displayName}
                  </p>
                  {displayEmail && (
                    <p className="text-body text-surface-400 dark:text-surface-500 truncate">
                      {displayEmail}
                    </p>
                  )}
                  <p className="text-caption font-medium mt-0.5" style={{ color }}>
                    Owner
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <OrgSwitcher />

          {/* Operational Rules */}
          <div>
            <SectionLabel>Operational Rules</SectionLabel>
            <Card>
              <CardContent className="py-0">
                <StepperRow
                  icon={<Pause className="size-4" />}
                  label="Stalled alert after"
                  value={state.orgSettings.noChangeAlertWorkdays}
                  unit="workdays"
                  onMinus={() => adjustSetting('noChangeAlertWorkdays', -1)}
                  onPlus={() => adjustSetting('noChangeAlertWorkdays', 1)}
                  color={color}
                />
                <StepperRow
                  icon={<RefreshCw className="size-4" />}
                  label="Rework escalation after"
                  value={state.orgSettings.reworkAlertCycles}
                  unit="cycles"
                  onMinus={() => adjustSetting('reworkAlertCycles', -1)}
                  onPlus={() => adjustSetting('reworkAlertCycles', 1)}
                  color={color}
                  last
                />
              </CardContent>
            </Card>
          </div>

          {/* Organization Info */}
          <div>
            <SectionLabel>Organization</SectionLabel>
            <Card>
              <CardContent className="py-0">
                <SettingRow icon={<Building2 className="size-4 text-surface-400" />} label="Org Name" value={state.onboarding.orgName} />
                <SettingRow icon={<Briefcase className="size-4 text-surface-400" />} label="Industry" value={state.onboarding.industry?.name || '-'} />
                <div className="flex items-center gap-3 py-3.5 border-b border-surface-100 dark:border-surface-800">
                  <MapPin className="size-4 text-surface-400 shrink-0" />
                  <span className="text-body text-surface-700 dark:text-surface-300 flex-1">
                    {sitesLabel}
                  </span>
                  <span className="text-body text-surface-400 dark:text-surface-500 mr-2">
                    {state.onboarding.sites.length}
                  </span>
                  <button
                    onClick={() => setShowCreateSite(true)}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-surface-100 dark:hover:bg-surface-800"
                    style={{ backgroundColor: color + '12' }}
                  >
                    <Plus className="size-4" style={{ color }} />
                  </button>
                </div>
                <SettingRow icon={<Users className="size-4 text-surface-400" />} label="Teams" value={String(teams.length)} />
                <SettingRow icon={<User className="size-4 text-surface-400" />} label="Employees" value={String(allEmployees.length)} />
                <SettingRow icon={<ClipboardList className="size-4 text-surface-400" />} label="Total Tasks" value={String(state.tasks.length)} />

                {/* Org Mode Toggle */}
                <div className="flex items-center gap-3 py-3.5">
                  <Shuffle className="size-4 text-surface-400 shrink-0" />
                  <span className="text-body text-surface-700 dark:text-surface-300 flex-1">Org Mode</span>
                  <div className="flex rounded-lg overflow-hidden border border-surface-200 dark:border-surface-700">
                    <button
                      onClick={() => {
                        if (orgMode === 'managed') return;
                        dispatch({ type: 'SET_ORG_MODE', mode: 'managed' });
                      }}
                      className={`px-3 py-1.5 text-caption font-semibold transition-colors ${
                        orgMode === 'managed'
                          ? 'bg-surface-900 dark:bg-surface-100 text-white dark:text-surface-900'
                          : 'bg-surface-50 dark:bg-surface-800 text-surface-500 dark:text-surface-400'
                      }`}
                    >
                      Managed
                    </button>
                    <button
                      onClick={() => {
                        if (orgMode === 'direct') return;
                        dispatch({ type: 'SET_ORG_MODE', mode: 'direct' });
                      }}
                      className={`px-3 py-1.5 text-caption font-semibold transition-colors ${
                        orgMode === 'direct'
                          ? 'bg-surface-900 dark:bg-surface-100 text-white dark:text-surface-900'
                          : 'bg-surface-50 dark:bg-surface-800 text-surface-500 dark:text-surface-400'
                      }`}
                    >
                      Direct
                    </button>
                  </div>
                </div>
                <p className="text-caption text-surface-400 dark:text-surface-500 -mt-1 ml-7 pb-2">
                  {orgMode === 'managed' ? 'Teams with subadmin leads' : 'Admin manages employees directly'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* App Settings */}
          <div>
            <SectionLabel>App Settings</SectionLabel>
            <Card>
              <CardContent className="py-0">
                <SettingRow icon={<Bell className="size-4 text-surface-400" />} label="Notifications" value="Coming soon" />
                <div className="py-1">
                  <ThemeSwitcher />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* App Info */}
          <Card>
            <CardContent className="py-0">
              <SettingRow icon={<Info className="size-4 text-surface-400" />} label="Version" value="1.0.0" last />
            </CardContent>
          </Card>

          {/* Sign Out */}
          <button
            onClick={async () => {
              if (window.confirm('Are you sure you want to sign out?')) {
                await signOut();
                window.location.href = '/sign-in';
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-body font-medium"
          >
            <LogOut className="size-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Create Site Modal */}
      {showCreateSite && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowCreateSite(false)} />
          <div className="relative bg-white dark:bg-surface-950 rounded-t-3xl md:rounded-card px-5 pt-5 pb-10 w-full md:max-w-lg">
            <div className="flex items-center justify-between mb-5">
              <p className="text-heading text-surface-900 dark:text-surface-100">Add Team</p>
              <button onClick={() => setShowCreateSite(false)} className="text-surface-500 text-xl">&times;</button>
            </div>

            <p className="text-caption text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2">
              Team Name
            </p>
            <input
              className="w-full bg-surface-50 dark:bg-surface-900 rounded-xl px-4 py-3 text-body text-surface-900 dark:text-surface-100 mb-4 outline-none border border-surface-200 dark:border-surface-800 focus:border-surface-400 dark:focus:border-surface-600 transition-colors"
              placeholder="Victoria Hub"
              value={siteName}
              onChange={(e) => {
                setSiteName(e.target.value);
                setSiteError('');
              }}
            />

            <p className="text-caption text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2">
              Team Code (optional)
            </p>
            <input
              className="w-full bg-surface-50 dark:bg-surface-900 rounded-xl px-4 py-3 text-body text-surface-900 dark:text-surface-100 mb-4 outline-none uppercase border border-surface-200 dark:border-surface-800 focus:border-surface-400 dark:focus:border-surface-600 transition-colors"
              placeholder="VIC-HUB"
              value={siteCode}
              onChange={(e) => {
                setSiteCode(e.target.value);
                setSiteError('');
              }}
            />

            {siteError ? (
              <p className="text-body text-red-600 mb-4">{siteError}</p>
            ) : null}

            <Button
              onClick={() => void handleCreateSite()}
              disabled={isSavingSite}
              style={{ backgroundColor: color }}
            >{isSavingSite ? 'Creating team...' : 'Create Team'}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Section Label ─── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-caption text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2 px-1">
      {children}
    </p>
  );
}

/* ─── Setting Row ─── */
function SettingRow({
  icon,
  label,
  value,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex gap-3 py-3.5 items-center ${last ? '' : 'border-b border-surface-100 dark:border-surface-800'}`}
    >
      <div className="shrink-0">{icon}</div>
      <span className="text-body text-surface-700 dark:text-surface-300 flex-1 pr-2 min-w-0">
        {label}
      </span>
      <span className="text-body text-surface-400 dark:text-surface-500 text-right max-w-[46%] shrink truncate">
        {value}
      </span>
    </div>
  );
}

/* ─── Stepper Row ─── */
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
  icon: React.ReactNode;
  label: string;
  value: number;
  unit: string;
  onMinus: () => void;
  onPlus: () => void;
  color: string;
  last?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 py-3.5 ${last ? '' : 'border-b border-surface-100 dark:border-surface-800'}`}>
      <div className="shrink-0" style={{ color }}>{icon}</div>
      <span className="text-body text-surface-700 dark:text-surface-300 flex-1 min-w-0 truncate">{label}</span>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onMinus}
          className="w-9 h-9 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-surface-500 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors text-body"
        >
          -
        </button>
        <span className="text-body font-semibold text-surface-900 dark:text-surface-100 min-w-[3rem] text-center">
          {value}{unit === 'workdays' ? 'd' : unit === 'cycles' ? 'x' : unit}
        </span>
        <button
          onClick={onPlus}
          className="w-9 h-9 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-surface-500 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors text-body"
        >
          +
        </button>
      </div>
    </div>
  );
}
