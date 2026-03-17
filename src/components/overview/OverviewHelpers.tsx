'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { HealthCard } from '@/components/overview/HealthCard';
import { ScoreBadge } from '@/components/performance/ScoreBadge';
import { useSiteHealth, useTeamHealth, useSubadminPerformance } from '@/store/selectors';

/* ─── Section Header ─── */
export function SectionHeader({
  title,
  count,
  accentColor,
}: {
  title: string;
  count?: number;
  accentColor?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {accentColor && (
        <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: accentColor }} />
      )}
      <h2 className="text-caption font-semibold text-surface-400 dark:text-surface-500 uppercase tracking-wider">
        {title}
      </h2>
      {count !== undefined && (
        <span className="text-caption font-medium text-surface-300 dark:text-surface-600">{count}</span>
      )}
    </div>
  );
}

/* ─── Quick Stat Row ─── */
export function QuickStat({
  icon,
  label,
  value,
  border,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  border?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 py-3 ${border ? 'border-b border-surface-100 dark:border-surface-800' : ''}`}>
      {icon}
      <span className="text-caption text-surface-600 dark:text-surface-400 flex-1">{label}</span>
      <span className="text-caption font-semibold text-surface-900 dark:text-surface-100">{value}</span>
    </div>
  );
}

/* ─── Site Health Row ─── */
export function SiteHealthRow({ siteId, siteName }: { siteId: string; siteName: string }) {
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

/* ─── Team Health Row ─── */
export function TeamHealthRow({
  teamId, teamName, teamColor, leadName, memberCount,
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
      rightContent={<ScoreBadge score={teamPerf.score} band={teamPerf.band} size="sm" />}
    />
  );
}
