'use client';

import { useMemo, useState } from 'react';
import { useEmployeeSummaries, useAllEmployeePerformances, useTeams, useAvailability, useOrgMode, useAllEmployees } from '../../../../src/store/selectors';
import { getActiveAvailability } from '../../../../src/utils/availability-helpers';
import { getToday } from '../../../../src/utils/date';
import type { Role, Team } from '../../../../src/types';
import { Avatar } from '../../../../src/components/ui/Avatar';
import { Card } from '../../../../src/components/ui/Card';
import { EmptyState } from '../../../../src/components/ui/EmptyState';
import { EmployeeSummaryCard } from '../../../../src/components/people/EmployeeSummaryCard';
import { ScoreBadge } from '../../../../src/components/performance/ScoreBadge';
import { Select } from '../../../../src/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useApp } from '../../../../src/store/AppContext';
import { useIndustryColor } from '../../../../src/store/selectors';
import { useTheme } from '../../../../src/providers/ThemeProvider';
import { uid } from '../../../../src/utils/id';

const PREVIEW_LIMIT = 8;

interface LeadOption {
  label: string;
  value: string;
  userId?: string;
  userName?: string;
}

type MemberRoleOption = 'subadmin' | 'employee';

export default function OwnerPeopleScreen() {
  const { state, dispatch } = useApp();
  const teams = useTeams();
  const allEmployees = useAllEmployees();
  const orgMode = useOrgMode();
  const isDirect = orgMode === 'direct';
  const color = useIndustryColor();
  const { isDark } = useTheme();
  const summaries = useEmployeeSummaries();
  const allPerfs = useAllEmployeePerformances();
  const availability = useAvailability();
  const today = getToday();
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [showAll, setShowAll] = useState<Record<string, boolean>>({});
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamColor, setTeamColor] = useState('#6366f1');
  const [teamSiteId, setTeamSiteId] = useState(state.onboarding.sites[0]?.id || '');
  const [teamLeadMembershipId, setTeamLeadMembershipId] = useState('');
  const [demoLeadName, setDemoLeadName] = useState('');
  const [teamError, setTeamError] = useState('');
  const [isSavingTeam, setIsSavingTeam] = useState(false);
  const [showCreateMember, setShowCreateMember] = useState(false);
  const [memberRole, setMemberRole] = useState<MemberRoleOption>('employee');
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPassword, setMemberPassword] = useState('');
  const [memberTeamId, setMemberTeamId] = useState('');
  const [memberSiteId, setMemberSiteId] = useState(state.onboarding.sites[0]?.id || '');
  const [memberError, setMemberError] = useState('');
  const [isSavingMember, setIsSavingMember] = useState(false);
  const [editMember, setEditMember] = useState<{ id: string; name: string; email: string } | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editTeamId, setEditTeamId] = useState('');
  const [editSiteId, setEditSiteId] = useState('');
  const [editError, setEditError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const leadOptions = (() => {
    return teams.map((team) => ({
      label: `${team.lead.name} · ${team.name}`,
      value: team.lead.id,
    }));
  })();

  const canCreateRealTeam = true || leadOptions.length > 0;
  const teamOptions = teams.map((team) => ({
    label: team.name,
    value: team.id,
  }));

  const handleCreateMember = async () => {
    const trimmedName = memberName.trim();
    const normalizedEmail = memberEmail.trim().toLowerCase();

    if (trimmedName.length < 2) {
      setMemberError('Enter a name with at least 2 characters.');
      return;
    }

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setMemberError('Enter a valid email address.');
      return;
    }

    if (!true) {
      if (!memberPassword) {
        setMemberError('A password is required so this person can sign in.');
        return;
      }
      if (memberPassword.length < 6) {
        setMemberError('Password must be at least 6 characters.');
        return;
      }
    }

    if (memberRole === 'employee' && !memberTeamId && !isDirect) {
      setMemberError('Choose the team this employee belongs to.');
      return;
    }

    setMemberError('');
    setIsSavingMember(true);

    try {
      if (memberRole === 'subadmin' && !isDirect) {
        setMemberError('Create a new lead with Add Team.');
        return;
      }

      if (isDirect || !memberTeamId) {
        const nextEmployeeId = uid();
        if (memberTeamId) {
          const selectedTeam = teams.find((team) => team.id === memberTeamId);
          if (selectedTeam) {
            const selectedSite = state.onboarding.sites.find((s) => s.id === memberSiteId);
            dispatch({
              type: 'ADD_MEMBER_TO_TEAM',
              teamId: selectedTeam.id,
              member: {
                id: nextEmployeeId,
                name: trimmedName,
                role: 'employee',
                teamId: selectedTeam.id,
                teamName: selectedTeam.name,
                siteId: memberSiteId || undefined,
                siteName: selectedSite?.name,
              },
            });
          }
        } else {
          const selectedSite = state.onboarding.sites.find((s) => s.id === memberSiteId);
          dispatch({
            type: 'ADD_STANDALONE_EMPLOYEE',
            employee: {
              id: nextEmployeeId,
              name: trimmedName,
              role: 'employee',
              siteId: memberSiteId || undefined,
              siteName: selectedSite?.name,
            },
          });
        }
      } else {
        const selectedTeam = teams.find((team) => team.id === memberTeamId);
        if (!selectedTeam) {
          setMemberError('Select a valid team first.');
          return;
        }

        const nextEmployeeId = uid();
        dispatch({
          type: 'ADD_MEMBER_TO_TEAM',
          teamId: selectedTeam.id,
          member: {
            id: nextEmployeeId,
            name: trimmedName,
            role: 'employee',
            teamId: selectedTeam.id,
            teamName: selectedTeam.name,
          },
        });
      }

      setMemberName('');
      setMemberEmail('');
      setMemberPassword('');
      setMemberTeamId('');
      setMemberSiteId(state.onboarding.sites[0]?.id || '');
      setMemberRole('employee');
      setShowCreateMember(false);
    } catch (error) {
      setMemberError(error instanceof Error ? error.message : 'We could not create that person yet.');
    } finally {
      setIsSavingMember(false);
    }
  };

  const handleCreateTeam = async () => {
    const trimmedTeamName = teamName.trim();

    if (trimmedTeamName.length < 2) {
      setTeamError('Enter a team name with at least 2 characters.');
      return;
    }

    if (!teamSiteId) {
      setTeamError('Choose the site this team belongs to.');
      return;
    }

    if (true) {
      if (demoLeadName.trim().length < 2) {
        setTeamError('Enter a lead name for this demo team.');
        return;
      }
    } else if (!teamLeadMembershipId) {
      setTeamError('Select a subadmin lead before creating the team.');
      return;
    }

    setTeamError('');
    setIsSavingTeam(true);

    try {
      const nextTeamId = uid();
      dispatch({
        type: 'ADD_TEAM',
        team: {
          id: nextTeamId,
          name: trimmedTeamName,
          color: teamColor,
          siteId: teamSiteId,
          lead: {
            id: uid(),
            name: demoLeadName.trim(),
            role: 'subadmin',
            teamId: nextTeamId,
            teamName: trimmedTeamName,
          },
          members: [],
        },
      });

      setTeamName('');
      setTeamColor('#6366f1');
      setTeamLeadMembershipId('');
      setDemoLeadName('');
      setTeamSiteId(state.onboarding.sites[0]?.id || '');
      setShowCreateTeam(false);
    } catch (error) {
      setTeamError(error instanceof Error ? error.message : 'We could not create that team yet.');
    } finally {
      setIsSavingTeam(false);
    }
  };

  const handleEditMember = async () => {
    if (!editMember) return;

    const trimmedName = editName.trim();

    if (trimmedName.length > 0 && trimmedName.length < 2) {
      setEditError('Name must be at least 2 characters.');
      return;
    }

    setEditError('');
    setIsSavingEdit(true);

    try {
      const selectedSite = state.onboarding.sites.find((s) => s.id === editSiteId);
      dispatch({
        type: 'REASSIGN_EMPLOYEE',
        employeeId: editMember.id,
        newTeamId: editTeamId || undefined,
        siteId: editSiteId || undefined,
        siteName: selectedSite?.name,
      });

      setEditMember(null);
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Failed to save changes.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="flex-1 bg-surface-50 dark:bg-surface-950 min-h-screen">
      <div className="overflow-y-auto pb-24">
        <div className="px-5 pt-4">
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
                <span className="text-caption whitespace-nowrap" style={{ color }}>
                  Add Person
                </span>
              </button>
              {!isDirect && (
                <button
                  onClick={() => setShowCreateTeam(true)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700"
                >
                  <span style={{ color }} className="text-sm">+</span>
                  <span className="text-caption whitespace-nowrap" style={{ color }}>
                    Add Team
                  </span>
                </button>
              )}
            </div>
          </div>

          {isDirect && allEmployees.length === 0 && (
            <EmptyState
              icon="people-outline"
              title="No people yet"
              subtitle="Add your first employee to get started."
            />
          )}

          {isDirect && allEmployees.length > 0 && (
            <Card>
              {allEmployees.map((emp, idx) => {
                const summary = summaries.get(emp.id) || {
                  activeCount: 0,
                  overdueCount: 0,
                  lastActivity: null,
                  checkedInToday: false,
                };
                const perf = allPerfs.get(emp.id);
                const activeAvail = getActiveAvailability(emp.id, today, availability);
                const availBadge = activeAvail
                  ? {
                      label: activeAvail.type === 'sick' ? 'Sick' : activeAvail.type === 'leave' ? 'On leave' : 'Off duty',
                      color: activeAvail.type === 'sick' ? '#ef4444' : activeAvail.type === 'leave' ? '#3b82f6' : '#6366f1',
                    }
                  : null;
                return (
                  <EmployeeSummaryCard
                    key={emp.id}
                    name={emp.name}
                    teamColor={color}
                    summary={summary}
                    isLead={false}
                    last={idx === allEmployees.length - 1}
                    score={perf?.score}
                    band={perf?.band}
                    topAction={perf?.actions[0]?.label}
                    siteName={emp.siteName}
                    availabilityBadge={availBadge}
                    onPress={() => {
                      setEditMember({ id: emp.id, name: emp.name, email: '' });
                      setEditName(emp.name);
                      setEditEmail('');
                      setEditPassword('');
                      setEditTeamId(emp.teamId || '');
                      setEditSiteId(emp.siteId || '');
                      setEditError('');
                    }}
                  />
                );
              })}
            </Card>
          )}

          {!isDirect && teams.length === 0 && (
            <EmptyState
              icon="people-outline"
              title="No teams yet"
              subtitle="Create a subadmin to get started."
            />
          )}

          {!isDirect && teams.map((team) => {
            const isExpanded = expandedTeam === team.id;
            const allMembers = [team.lead, ...team.members];
            const isShowingAll = showAll[team.id];
            const visibleMembers = isShowingAll
              ? allMembers
              : allMembers.slice(0, PREVIEW_LIMIT);
            const remaining = allMembers.length - PREVIEW_LIMIT;

            const teamActiveCount = allMembers.reduce(
              (sum, m) => sum + (summaries.get(m.id)?.activeCount || 0),
              0
            );
            const teamOverdueCount = allMembers.reduce(
              (sum, m) => sum + (summaries.get(m.id)?.overdueCount || 0),
              0
            );

            const memberScores = team.members
              .map((m) => allPerfs.get(m.id))
              .filter(Boolean);
            const teamAvgScore = memberScores.length > 0
              ? Math.round(memberScores.reduce((s, p) => s + p!.score, 0) / memberScores.length)
              : 100;
            const teamBand = teamAvgScore >= 85 ? 'green' as const : teamAvgScore >= 70 ? 'amber' as const : 'red' as const;
            const atRiskCount = memberScores.filter((p) => p!.band !== 'green').length;

            return (
              <div key={team.id} className="mb-3">
                <button
                  onClick={() => setExpandedTeam(isExpanded ? null : team.id)}
                  className="w-full text-left"
                >
                  <Card>
                    <div className="flex items-center gap-3 px-4 -my-1">
                      <Avatar name={team.name} color={team.color} />
                      <div className="flex-1 min-w-0">
                        <p className="text-body font-semibold text-surface-900 dark:text-surface-100 truncate">
                          {team.name}
                        </p>
                        <p className="text-caption text-surface-400 dark:text-surface-500 truncate">
                          {allMembers.length} {allMembers.length === 1 ? 'person' : 'people'} · {teamActiveCount} active
                          {teamOverdueCount > 0 ? ` · ${teamOverdueCount} overdue` : ''}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <ScoreBadge score={teamAvgScore} band={teamBand} size="sm" />
                        {atRiskCount > 0 && (
                          <span className="text-[9px] text-amber-500 font-medium">
                            {atRiskCount} at risk
                          </span>
                        )}
                      </div>
                      <span className="text-surface-400 text-caption flex items-center justify-center w-10 h-10 shrink-0">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </Card>
                </button>

                {isExpanded && (
                  <Card className="mt-1.5 ml-2">
                    {visibleMembers.map((member, idx) => {
                      const summary = summaries.get(member.id) || {
                        activeCount: 0,
                        overdueCount: 0,
                        lastActivity: null,
                        checkedInToday: false,
                      };
                      const perf = allPerfs.get(member.id);
                      const activeAvail = getActiveAvailability(member.id, today, availability);
                      const availBadge = activeAvail
                        ? {
                            label: activeAvail.type === 'sick' ? 'Sick' : activeAvail.type === 'leave' ? 'On leave' : 'Off duty',
                            color: activeAvail.type === 'sick' ? '#ef4444' : activeAvail.type === 'leave' ? '#3b82f6' : '#6366f1',
                          }
                        : null;
                      return (
                        <EmployeeSummaryCard
                          key={member.id}
                          name={member.name}
                          teamColor={team.color}
                          summary={summary}
                          isLead={member.id === team.lead.id}
                          last={idx === visibleMembers.length - 1 && remaining <= 0}
                          score={perf?.score}
                          band={perf?.band}
                          topAction={perf?.actions[0]?.label}
                          availabilityBadge={availBadge}
                          onPress={!true ? () => {
                            setEditMember({ id: member.id, name: member.name, email: '' });
                            setEditName(member.name);
                            setEditEmail('');
                            setEditPassword('');
                            setEditTeamId(team.id);
                            setEditSiteId(team.siteId || '');
                            setEditError('');
                          } : undefined}
                        />
                      );
                    })}
                    {remaining > 0 && !isShowingAll && (
                      <button
                        onClick={() =>
                          setShowAll((prev) => ({ ...prev, [team.id]: true }))
                        }
                        className="py-2 w-full text-center"
                      >
                        <span className="text-caption font-medium text-surface-400">
                          View all ({allMembers.length})
                        </span>
                      </button>
                    )}
                  </Card>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Member Modal */}
      {showCreateMember && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="fixed inset-0 bg-black/30" onClick={() => setShowCreateMember(false)} />
          <div className="relative bg-white dark:bg-surface-950 rounded-t-3xl md:rounded-3xl px-5 pt-5 pb-10 w-full md:max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <p className="text-heading text-surface-900 dark:text-surface-100">Add Person</p>
              <button onClick={() => setShowCreateMember(false)} className="text-surface-500 text-xl">&times;</button>
            </div>

            {!isDirect && (
              <Select
                label="Role"
                placeholder="Choose a role"
                options={[
                  { label: 'Employee', value: 'employee' },
                  ...(!true ? [{ label: 'Subadmin', value: 'subadmin' }] : []),
                ]}
                value={memberRole}
                onChange={(value) => {
                  setMemberRole(value as MemberRoleOption);
                  setMemberError('');
                }}
              />
            )}

            <div className="mt-4">
              <p className="text-caption text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2">
                Full Name
              </p>
              <input
                className="w-full bg-surface-50 dark:bg-surface-900 rounded-card px-4 py-3.5 text-body text-surface-900 dark:text-surface-100 mb-4 outline-none"
                placeholder="Ada Nwobi"
                value={memberName}
                onChange={(e) => {
                  setMemberName(e.target.value);
                  setMemberError('');
                }}
              />

              <p className="text-caption text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2">
                Work Email
              </p>
              <input
                className="w-full bg-surface-50 dark:bg-surface-900 rounded-card px-4 py-3.5 text-body text-surface-900 dark:text-surface-100 mb-4 outline-none"
                placeholder="ada@company.com"
                value={memberEmail}
                onChange={(e) => {
                  setMemberEmail(e.target.value);
                  setMemberError('');
                }}
                type="email"
              />

              {!true && (
                <>
                  <p className="text-caption text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2">
                    Password <span className="text-red-400">*</span>
                  </p>
                  <input
                    className="w-full bg-surface-50 dark:bg-surface-900 rounded-card px-4 py-3.5 text-body text-surface-900 dark:text-surface-100 outline-none"
                    placeholder="Min. 6 characters (required)"
                    value={memberPassword}
                    onChange={(e) => {
                      setMemberPassword(e.target.value);
                      setMemberError('');
                    }}
                    type="password"
                  />
                </>
              )}
            </div>

            {isDirect ? (
              <>
                {teamOptions.length > 0 && (
                  <div className="mt-4">
                    <Select
                      label="Team (optional)"
                      placeholder="No team"
                      options={[{ label: 'No team', value: '' }, ...teamOptions]}
                      value={memberTeamId}
                      onChange={(value) => {
                        setMemberTeamId(value);
                        setMemberError('');
                      }}
                    />
                  </div>
                )}
                {state.onboarding.sites.length > 0 && (
                  <div className="mt-4">
                    <Select
                      label="Site (optional)"
                      placeholder="No site"
                      options={[{ label: 'No site', value: '' }, ...state.onboarding.sites.map((site) => ({ label: site.name, value: site.id }))]}
                      value={memberSiteId}
                      onChange={(value) => {
                        setMemberSiteId(value);
                        setMemberError('');
                      }}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="mt-4">
                <Select
                  label={memberRole === 'employee' ? 'Team' : 'Primary Site'}
                  placeholder={
                    memberRole === 'employee'
                      ? teamOptions.length > 0
                        ? 'Choose a team'
                        : 'Create a team first'
                      : 'Choose a site'
                  }
                  options={
                    memberRole === 'employee'
                      ? teamOptions
                      : state.onboarding.sites.map((site) => ({
                          label: site.name,
                          value: site.id,
                        }))
                  }
                  value={memberRole === 'employee' ? memberTeamId : memberSiteId}
                  onChange={(value) => {
                    if (memberRole === 'employee') {
                      setMemberTeamId(value);
                    } else {
                      setMemberSiteId(value);
                    }
                    setMemberError('');
                  }}
                />
              </div>
            )}

            <p className="text-body text-surface-400 dark:text-surface-500 leading-6 mt-5">
              {true
                ? (isDirect
                  ? 'This employee will report directly to you.'
                  : memberRole === 'employee'
                    ? 'Employees are attached to a team immediately.'
                    : 'Subadmins become team leads right away.')
                : 'Set a password so this person can sign in immediately — no email confirmation needed.'}
            </p>

            {memberError ? (
              <p className="text-body text-red-600 mt-4">{memberError}</p>
            ) : null}

            <div className="mt-5">
              <Button
                onClick={() => void handleCreateMember()}
                disabled={isSavingMember || (!isDirect && memberRole === 'employee' && teamOptions.length === 0)}
                style={{ backgroundColor: color }}
              >{isSavingMember ? 'Creating person...' : 'Create Person'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateTeam && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="fixed inset-0 bg-black/30" onClick={() => setShowCreateTeam(false)} />
          <div className="relative bg-white dark:bg-surface-950 rounded-t-3xl md:rounded-3xl px-5 pt-5 pb-10 w-full md:max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <p className="text-heading text-surface-900 dark:text-surface-100">Add Team</p>
              <button onClick={() => setShowCreateTeam(false)} className="text-surface-500 text-xl">&times;</button>
            </div>

            <p className="text-caption text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2">
              Team Name
            </p>
            <input
              className="w-full bg-surface-50 dark:bg-surface-900 rounded-card px-4 py-3.5 text-body text-surface-900 dark:text-surface-100 mb-4 outline-none"
              placeholder="Operations North"
              value={teamName}
              onChange={(e) => {
                setTeamName(e.target.value);
                setTeamError('');
              }}
            />

            <Select
              label="Site"
              placeholder="Choose a site"
              options={state.onboarding.sites.map((site) => ({
                label: site.name,
                value: site.id,
              }))}
              value={teamSiteId}
              onChange={(value) => {
                setTeamSiteId(value);
                setTeamError('');
              }}
            />

            <div className="mt-4">
              {true ? (
                <>
                  <p className="text-caption text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2">
                    Lead Name
                  </p>
                  <input
                    className="w-full bg-surface-50 dark:bg-surface-900 rounded-card px-4 py-3.5 text-body text-surface-900 dark:text-surface-100 outline-none"
                    placeholder="Enter a lead name"
                    value={demoLeadName}
                    onChange={(e) => {
                      setDemoLeadName(e.target.value);
                      setTeamError('');
                    }}
                  />
                </>
              ) : (
                <Select
                  label="Subadmin Lead"
                  placeholder={
                    leadOptions.length > 0
                      ? 'Choose a lead'
                      : 'Invite a subadmin first'
                  }
                  options={leadOptions}
                  value={teamLeadMembershipId}
                  onChange={(value) => {
                    setTeamLeadMembershipId(value);
                    setTeamError('');
                  }}
                />
              )}
            </div>

            <div className="mt-4">
              <p className="text-caption text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2">
                Team Color
              </p>
              <div className="flex flex-wrap gap-3">
                {['#6366f1', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2'].map((swatch) => {
                  const selected = teamColor === swatch;
                  return (
                    <button
                      key={swatch}
                      onClick={() => setTeamColor(swatch)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${selected ? 'ring-2 ring-surface-900 dark:ring-surface-100' : ''}`}
                      style={{ backgroundColor: swatch }}
                    >
                      {selected ? <span className="text-white text-sm">✓</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {!true && !canCreateRealTeam ? (
              <p className="text-body text-surface-400 dark:text-surface-500 leading-6 mt-5">
                This org does not have any available subadmins yet. Create or invite a subadmin first, then you can attach that lead to a new team.
              </p>
            ) : (
              <p className="text-body text-surface-400 dark:text-surface-500 leading-6 mt-5">
                Teams show up in owner, subadmin, and employee views. We keep the lead attached at creation so the team has a clear owner from day one.
              </p>
            )}

            {teamError ? (
              <p className="text-body text-red-600 mt-4">{teamError}</p>
            ) : null}

            <div className="mt-5">
              <Button
                onClick={() => void handleCreateTeam()}
                disabled={isSavingTeam || (!true && !canCreateRealTeam)}
                style={{ backgroundColor: color }}
              >{isSavingTeam ? 'Creating team...' : 'Create Team'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Person Modal */}
      {editMember && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="fixed inset-0 bg-black/30" onClick={() => setEditMember(null)} />
          <div className="relative bg-white dark:bg-surface-950 rounded-t-3xl md:rounded-3xl px-5 pt-5 pb-10 w-full md:max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <p className="text-heading text-surface-900 dark:text-surface-100">Edit Person</p>
              <button onClick={() => setEditMember(null)} className="text-surface-500 text-xl">&times;</button>
            </div>

            <p className="text-caption text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2">
              Full Name
            </p>
            <input
              className="w-full bg-surface-50 dark:bg-surface-900 rounded-card px-4 py-3.5 text-body text-surface-900 dark:text-surface-100 mb-4 outline-none"
              placeholder="Full name"
              value={editName}
              onChange={(e) => { setEditName(e.target.value); setEditError(''); }}
            />

            <p className="text-caption text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2">
              Email
            </p>
            <input
              className="w-full bg-surface-50 dark:bg-surface-900 rounded-card px-4 py-3.5 text-body text-surface-900 dark:text-surface-100 mb-4 outline-none"
              placeholder="New email (leave empty to keep current)"
              value={editEmail}
              onChange={(e) => { setEditEmail(e.target.value); setEditError(''); }}
              type="email"
            />

            <p className="text-caption text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2">
              New Password
            </p>
            <input
              className="w-full bg-surface-50 dark:bg-surface-900 rounded-card px-4 py-3.5 text-body text-surface-900 dark:text-surface-100 outline-none"
              placeholder="Leave empty to keep current"
              value={editPassword}
              onChange={(e) => { setEditPassword(e.target.value); setEditError(''); }}
              type="password"
            />

            {teamOptions.length > 0 && (
              <div className="mt-4">
                <Select
                  label="Team"
                  placeholder="No team"
                  options={[{ label: 'No team', value: '' }, ...teamOptions]}
                  value={editTeamId}
                  onChange={(value) => { setEditTeamId(value); setEditError(''); }}
                />
              </div>
            )}

            {state.onboarding.sites.length > 0 && (
              <div className="mt-4">
                <Select
                  label="Site"
                  placeholder="No site"
                  options={[{ label: 'No site', value: '' }, ...state.onboarding.sites.map((s) => ({ label: s.name, value: s.id }))]}
                  value={editSiteId}
                  onChange={(value) => { setEditSiteId(value); setEditError(''); }}
                />
              </div>
            )}

            <p className="text-body text-surface-400 dark:text-surface-500 leading-6 mt-4">
              Only fill in the fields you want to change.
            </p>

            {editError ? (
              <p className="text-body text-red-600 mt-3">{editError}</p>
            ) : null}

            <div className="mt-5 space-y-3">
              <Button
                onClick={() => void handleEditMember()}
                disabled={isSavingEdit}
                style={{ backgroundColor: color }}
              >{isSavingEdit ? 'Saving...' : 'Save Changes'}</Button>
              <button
                onClick={() => {
                  if (!editMember) return;
                  if (window.confirm(`Remove ${editMember.name} from this organization?`)) {
                    setEditMember(null);
                  }
                }}
                className="w-full py-3 text-center text-body font-semibold text-red-600"
              >
                Remove Person
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
