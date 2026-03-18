'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';
import { SectionLabel, SettingRow } from '@/components/more/MoreHelpers';
import type { OrgMode } from '@/types';
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
  LogOut,
  Plus,
} from 'lucide-react';

/* ─── Profile Card ─── */
export function ProfileCard({
  displayName,
  displayEmail,
  color,
}: {
  displayName: string;
  displayEmail: string;
  color: string;
}) {
  return (
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
  );
}

/* ─── Organization Info Section ─── */
export function OrganizationSection({
  orgName,
  industryName,
  sitesLabel,
  sitesCount,
  teamsCount,
  employeesCount,
  tasksCount,
  orgMode,
  color,
  onOrgModeChange,
  onAddSite,
}: {
  orgName: string;
  industryName: string;
  sitesLabel: string;
  sitesCount: number;
  teamsCount: number;
  employeesCount: number;
  tasksCount: number;
  orgMode: OrgMode;
  color: string;
  onOrgModeChange: (mode: OrgMode) => void;
  onAddSite: () => void;
}) {
  return (
    <div>
      <SectionLabel>Organization</SectionLabel>
      <Card>
        <CardContent className="py-0">
          <SettingRow icon={<Building2 className="size-4 text-surface-400" />} label="Org Name" value={orgName} />
          <SettingRow icon={<Briefcase className="size-4 text-surface-400" />} label="Industry" value={industryName} />
          <SitesRow sitesLabel={sitesLabel} sitesCount={sitesCount} color={color} onAdd={onAddSite} />
          <SettingRow icon={<Users className="size-4 text-surface-400" />} label="Teams" value={String(teamsCount)} />
          <SettingRow icon={<User className="size-4 text-surface-400" />} label="Employees" value={String(employeesCount)} />
          <SettingRow icon={<ClipboardList className="size-4 text-surface-400" />} label="Total Tasks" value={String(tasksCount)} />
          <OrgModeToggle orgMode={orgMode} onChange={onOrgModeChange} />
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Sites Row (inside Organization) ─── */
function SitesRow({
  sitesLabel,
  sitesCount,
  color,
  onAdd,
}: {
  sitesLabel: string;
  sitesCount: number;
  color: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-surface-100 dark:border-surface-800">
      <MapPin className="size-4 text-surface-400 shrink-0" />
      <span className="text-body text-surface-700 dark:text-surface-300 flex-1">
        {sitesLabel}
      </span>
      <span className="text-body text-surface-400 dark:text-surface-500 mr-2">
        {sitesCount}
      </span>
      <button
        onClick={onAdd}
        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-surface-100 dark:hover:bg-surface-800"
        style={{ backgroundColor: color + '12' }}
      >
        <Plus className="size-4" style={{ color }} />
      </button>
    </div>
  );
}

/* ─── Org Mode Toggle ─── */
function OrgModeToggle({
  orgMode,
  onChange,
}: {
  orgMode: OrgMode;
  onChange: (mode: OrgMode) => void;
}) {
  return (
    <>
      <div className="flex items-center gap-3 py-3.5">
        <Shuffle className="size-4 text-surface-400 shrink-0" />
        <span className="text-body text-surface-700 dark:text-surface-300 flex-1">Org Mode</span>
        <div className="flex rounded-lg overflow-hidden border border-surface-200 dark:border-surface-700">
          <button
            onClick={() => onChange('managed')}
            className={`px-3 py-1.5 text-caption font-semibold transition-colors ${
              orgMode === 'managed'
                ? 'bg-surface-900 dark:bg-surface-100 text-white dark:text-surface-900'
                : 'bg-surface-50 dark:bg-surface-800 text-surface-500 dark:text-surface-400'
            }`}
          >
            Managed
          </button>
          <button
            onClick={() => onChange('direct')}
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
    </>
  );
}

/* ─── App Settings Section ─── */
export function AppSettingsSection() {
  return (
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
  );
}

/* ─── App Info Card ─── */
export function AppInfoCard() {
  return (
    <Card>
      <CardContent className="py-0">
        <SettingRow icon={<Info className="size-4 text-surface-400" />} label="Version" value="1.0.0" last />
      </CardContent>
    </Card>
  );
}

/* ─── Sign Out Button ─── */
export function SignOutButton({ onSignOut }: { onSignOut: () => void }) {
  return (
    <button
      onClick={onSignOut}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-body font-medium"
    >
      <LogOut className="size-4" />
      Sign Out
    </button>
  );
}

