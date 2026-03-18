'use client';

import { useState, useCallback } from 'react';
import { useMutation } from 'convex/react';
import { useClerk } from '@clerk/nextjs';
import { useApp } from '@/store/AppContext';
import { api } from '@/lib/convexApi';
import { useIndustryColor, useTeams, useAllEmployees, useOrgMode, useSitesLabel } from '@/store/selectors';
import { useSession } from '@/providers/SessionProvider';
import { OrgSwitcher } from '@/components/layout/OrgSwitcher';
import { SectionLabel, StepperRow } from '@/components/more/MoreHelpers';
import { Card, CardContent } from '@/components/ui/Card';
import {
  ProfileCard,
  OrganizationSection,
  AppSettingsSection,
  AppInfoCard,
  SignOutButton,
} from '@/components/more/MoreSections';
import { CreateSiteModal } from '@/components/more/CreateSiteModal';
import { Pause, RefreshCw } from 'lucide-react';
import type { OrgMode } from '@/types';

export default function OwnerMoreScreen() {
  const { state, dispatch } = useApp();
  const color = useIndustryColor();
  const orgMode = useOrgMode();
  const { signOut } = useClerk();
  const { user } = useSession();
  const [showCreateSite, setShowCreateSite] = useState(false);

  const createSite = useMutation(api.sites.create);
  const updateSettings = useMutation(api.orgSettings.update);
  const updateMode = useMutation(api.organizations.updateMode);

  const adjustSetting = useCallback(
    (key: 'noChangeAlertWorkdays' | 'reworkAlertCycles', delta: number) => {
      const newVal = Math.max(1, Math.min(10, state.orgSettings[key] + delta));
      // Optimistic local update + persist to Convex
      dispatch({ type: 'SET_ORG_SETTINGS', settings: { [key]: newVal } });
      if (state.activeWorkspaceId) {
        updateSettings({ organizationId: state.activeWorkspaceId as any, [key]: newVal }).catch(console.error);
      }
    },
    [state.orgSettings, state.activeWorkspaceId, dispatch, updateSettings],
  );

  const handleOrgModeChange = useCallback(
    (mode: OrgMode) => {
      if (orgMode !== mode) {
        dispatch({ type: 'SET_ORG_MODE', mode });
        updateMode({ mode }).catch(console.error);
      }
    },
    [orgMode, dispatch, updateMode],
  );

  return (
    <div className="flex-1 bg-surface-50 dark:bg-surface-950 min-h-screen">
      <div className="overflow-y-auto pb-28 md:pb-8">
        <MoreScreenContent
          state={state}
          color={color}
          orgMode={orgMode}
          user={user}
          adjustSetting={adjustSetting}
          handleOrgModeChange={handleOrgModeChange}
          onAddSite={() => setShowCreateSite(true)}
          onSignOut={async () => {
            if (window.confirm('Are you sure you want to sign out?')) { await signOut(); window.location.href = '/sign-in'; }
          }}
        />
      </div>
      {showCreateSite && (
        <CreateSiteModal
          color={color}
          onClose={() => setShowCreateSite(false)}
          onCreateSite={async (name) => { await createSite({ name }); setShowCreateSite(false); }}
        />
      )}
    </div>
  );
}

/* ─── Inner content (keeps OwnerMoreScreen under 50 lines) ─── */
function MoreScreenContent({
  state, color, orgMode, user, adjustSetting, handleOrgModeChange, onAddSite, onSignOut,
}: {
  state: ReturnType<typeof useApp>['state'];
  color: string;
  orgMode: OrgMode;
  user: ReturnType<typeof useSession>['user'];
  adjustSetting: (key: 'noChangeAlertWorkdays' | 'reworkAlertCycles', delta: number) => void;
  handleOrgModeChange: (mode: OrgMode) => void;
  onAddSite: () => void;
  onSignOut: () => void;
}) {
  const teams = useTeams();
  const allEmployees = useAllEmployees();
  const sitesLabel = useSitesLabel();
  const displayName = user?.name || state.onboarding.adminName || 'Admin';

  return (
    <div className="px-5 lg:px-6 pt-5 space-y-4 max-w-2xl mx-auto">
      <ProfileCard displayName={displayName} displayEmail={user?.email || ''} color={color} />
      <OrgSwitcher />
      <OperationalRulesSection
        stalledDays={state.orgSettings.noChangeAlertWorkdays}
        reworkCycles={state.orgSettings.reworkAlertCycles}
        color={color}
        onAdjust={adjustSetting}
      />
      <OrganizationSection
        orgName={state.onboarding.orgName}
        industryName={state.onboarding.industry?.name || '-'}
        sitesLabel={sitesLabel}
        sitesCount={state.onboarding.sites.length}
        teamsCount={teams.length}
        employeesCount={allEmployees.length}
        tasksCount={state.tasks.length}
        orgMode={orgMode}
        color={color}
        onOrgModeChange={handleOrgModeChange}
        onAddSite={onAddSite}
      />
      <AppSettingsSection />
      <AppInfoCard />
      <SignOutButton onSignOut={onSignOut} />
    </div>
  );
}

/* ─── Operational Rules Section ─── */
function OperationalRulesSection({
  stalledDays, reworkCycles, color, onAdjust,
}: {
  stalledDays: number;
  reworkCycles: number;
  color: string;
  onAdjust: (key: 'noChangeAlertWorkdays' | 'reworkAlertCycles', delta: number) => void;
}) {
  return (
    <div>
      <SectionLabel>Operational Rules</SectionLabel>
      <Card>
        <CardContent className="py-0">
          <StepperRow
            icon={<Pause className="size-4" />}
            label="Stalled alert after"
            value={stalledDays}
            unit="workdays"
            onMinus={() => onAdjust('noChangeAlertWorkdays', -1)}
            onPlus={() => onAdjust('noChangeAlertWorkdays', 1)}
            color={color}
          />
          <StepperRow
            icon={<RefreshCw className="size-4" />}
            label="Rework escalation after"
            value={reworkCycles}
            unit="cycles"
            onMinus={() => onAdjust('reworkAlertCycles', -1)}
            onPlus={() => onAdjust('reworkAlertCycles', 1)}
            color={color}
            last
          />
        </CardContent>
      </Card>
    </div>
  );
}
