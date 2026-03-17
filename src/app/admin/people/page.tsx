'use client';

import { useMemo, useState } from 'react';
import {
  useEmployeeSummaries,
  useAllEmployeePerformances,
  useTeams,
  useAvailability,
  useOrgMode,
  useAllEmployees,
  useIndustryColor,
} from '@/store/selectors';
import { getActiveAvailability } from '@/utils/availability-helpers';
import { getToday } from '@/utils/date';
import type { Employee } from '@/types';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { EmployeeSummaryCard } from '@/components/people/EmployeeSummaryCard';
import { useApp } from '@/store/AppContext';
import { CreateMemberModal } from '@/components/people/CreateMemberModal';
import { CreateTeamModal } from '@/components/people/CreateTeamModal';
import { EditMemberModal } from '@/components/people/EditMemberModal';
import { TeamRow } from '@/components/people/TeamRow';

const PREVIEW_LIMIT = 8;

interface AvailBadge {
  label: string;
  color: string;
}

function getAvailBadge(
  employeeId: string,
  today: string,
  availability: ReturnType<typeof useAvailability>,
): AvailBadge | null {
  const active = getActiveAvailability(employeeId, today, availability);
  if (!active) return null;
  const configs: Record<string, AvailBadge> = {
    sick:     { label: 'Sick',     color: '#ef4444' },
    leave:    { label: 'On leave', color: '#3b82f6' },
    off_duty: { label: 'Off duty', color: '#6366f1' },
  };
  return configs[active.type] ?? null;
}

export default function OwnerPeopleScreen() {
  const { state } = useApp();
  const teams         = useTeams();
  const allEmployees  = useAllEmployees();
  const orgMode       = useOrgMode();
  const isDirect      = orgMode === 'direct';
  const color         = useIndustryColor();
  const summaries     = useEmployeeSummaries();
  const allPerfs      = useAllEmployeePerformances();
  const availability  = useAvailability();
  const today         = getToday();
  const sites         = state.onboarding.sites;

  const [expandedTeam,    setExpandedTeam]    = useState<string | null>(null);
  const [showAll,         setShowAll]         = useState<Record<string, boolean>>({});
  const [showCreateMember, setShowCreateMember] = useState(false);
  const [showCreateTeam,   setShowCreateTeam]   = useState(false);
  const [editTarget,       setEditTarget]       = useState<Employee | null>(null);

  const unassignedPeople = useMemo(
    () => (!isDirect ? allEmployees.filter((e) => !e.teamId) : []),
    [allEmployees, isDirect],
  );

  function renderMemberCard(
    member: Employee,
    idx: number,
    isLast: boolean,
    teamColor: string,
  ) {
    const summary = summaries.get(member.id) ?? {
      activeCount: 0, overdueCount: 0, lastActivity: null, checkedInToday: false,
    };
    const perf = allPerfs.get(member.id);
    const availBadge = getAvailBadge(member.id, today, availability);
    return (
      <EmployeeSummaryCard
        key={member.id}
        name={member.name}
        teamColor={teamColor}
        summary={summary}
        isLead={member.role === 'subadmin'}
        last={isLast}
        score={perf?.score}
        band={perf?.band}
        topAction={perf?.actions[0]?.label}
        siteName={member.siteName}
        availabilityBadge={availBadge}
        onPress={() => setEditTarget(member)}
      />
    );
  }

  return (
    <div className="flex-1 bg-surface-50 dark:bg-surface-950 min-h-screen">
      <div className="overflow-y-auto pb-24">
        <div className="px-5 pt-4">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <p className="text-caption text-surface-400 dark:text-surface-500 uppercase tracking-wider">
              {isDirect ? 'People' : 'Teams'}
            </p>
            <div className="flex flex-row gap-2">
              <button
                onClick={() => setShowCreateMember(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700"
              >
                <span style={{ color }} className="text-sm">+</span>
                <span className="text-caption whitespace-nowrap" style={{ color }}>Add Person</span>
              </button>
              {!isDirect && (
                <button
                  onClick={() => setShowCreateTeam(true)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700"
                >
                  <span style={{ color }} className="text-sm">+</span>
                  <span className="text-caption whitespace-nowrap" style={{ color }}>Add Team</span>
                </button>
              )}
            </div>
          </div>

          {/* Direct mode */}
          {isDirect && allEmployees.length === 0 && (
            <EmptyState icon="people-outline" title="No people yet" subtitle="Add your first employee to get started." />
          )}
          {isDirect && allEmployees.length > 0 && (
            <Card>
              {allEmployees.map((emp, idx) =>
                renderMemberCard(emp, idx, idx === allEmployees.length - 1, color),
              )}
            </Card>
          )}

          {/* Managed mode — team list */}
          {!isDirect && teams.length === 0 && (
            <EmptyState icon="people-outline" title="No teams yet" subtitle="Create a subadmin to get started." />
          )}
          {!isDirect && teams.map((team) => {
            const allMembers   = [team.lead, ...team.members];
            const isShowingAll = showAll[team.id] ?? false;
            const visible      = isShowingAll ? allMembers : allMembers.slice(0, PREVIEW_LIMIT);
            const scores       = team.members.map((m) => allPerfs.get(m.id)).filter(Boolean);
            const avgScore     = scores.length > 0
              ? Math.round(scores.reduce((s, p) => s + p!.score, 0) / scores.length) : 100;
            const stats = {
              allMembers,
              visible,
              remaining:    allMembers.length - PREVIEW_LIMIT,
              isShowingAll,
              teamActive:   allMembers.reduce((s, m) => s + (summaries.get(m.id)?.activeCount  ?? 0), 0),
              teamOverdue:  allMembers.reduce((s, m) => s + (summaries.get(m.id)?.overdueCount ?? 0), 0),
              avgScore,
              band:         avgScore >= 85 ? 'green' as const : avgScore >= 70 ? 'amber' as const : 'red' as const,
              atRisk:       scores.filter((p) => p!.band !== 'green').length,
            };
            return (
              <TeamRow
                key={team.id}
                team={team}
                stats={stats}
                isExpanded={expandedTeam === team.id}
                onToggle={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
                onShowAll={() => setShowAll((prev) => ({ ...prev, [team.id]: true }))}
                renderMember={(member, idx, isLast) => renderMemberCard(member, idx, isLast, team.color)}
              />
            );
          })}

          {/* Unassigned people */}
          {!isDirect && unassignedPeople.length > 0 && (
            <div className="mt-4">
              <Card>
                <div className="px-4 pb-3">
                  <p className="text-body font-semibold text-surface-900 dark:text-surface-100">Unlinked People</p>
                  <p className="text-caption text-surface-400 dark:text-surface-500 mt-1">
                    These people belong to a site but are not currently linked to a team.
                  </p>
                </div>
                {unassignedPeople.map((member, idx) =>
                  renderMemberCard(member, idx, idx === unassignedPeople.length - 1, color),
                )}
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateMember && (
        <CreateMemberModal
          sites={sites}
          teams={teams}
          isDirect={isDirect}
          color={color}
          onClose={() => setShowCreateMember(false)}
        />
      )}
      {showCreateTeam && (
        <CreateTeamModal
          sites={sites}
          color={color}
          onClose={() => setShowCreateTeam(false)}
        />
      )}
      {editTarget && (
        <EditMemberModal
          member={{
            id:     editTarget.id,
            name:   editTarget.name,
            email:  editTarget.email  ?? '',
            phone:  editTarget.phone  ?? '',
            teamId: editTarget.teamId,
            siteId: editTarget.siteId ?? sites[0]?.id,
          }}
          sites={sites}
          teams={teams}
          color={color}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}
