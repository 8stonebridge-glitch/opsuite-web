'use client';

import { useApp } from './AppContext';
import type { Team, Employee, OrgMode } from '../types';

export function useOrgMode(): OrgMode {
  const { state } = useApp();
  return state.orgMode;
}

export function useTeams(): Team[] {
  const { state } = useApp();
  return state.teams;
}

export function useAllEmployees(): Employee[] {
  const { state } = useApp();
  return state.allEmployees;
}

export function useCurrentUser(): Employee | null {
  const { state } = useApp();
  if (state.role === 'admin') return null;
  return state.allEmployees.find((e) => e.id === state.userId) ?? null;
}

export function useCurrentName(): string {
  const { state } = useApp();
  if (state.role === 'admin') return state.onboarding.adminName || 'Admin';
  const user = state.allEmployees.find((e) => e.id === state.userId);
  return user?.name || 'User';
}

export function useCurrentRoleLabel(): string {
  const { state } = useApp();
  if (state.role === 'admin') return 'Owner';
  if (state.role === 'subadmin') return 'SubAdmin';
  return 'Employee';
}

export function useMyTeam() {
  const { state } = useApp();
  if (state.orgMode === 'direct') return undefined;
  return state.teams.find(
    (t) => t.lead.id === state.userId || t.members.some((m) => m.id === state.userId),
  );
}

export function useTeamMemberIds(): string[] {
  const team = useMyTeam();
  if (!team) return [];
  return [team.lead.id, ...team.members.map((m) => m.id)];
}

export function useIndustryColor(): string {
  const { state } = useApp();
  return state.onboarding.industry?.color || '#059669';
}

export function useSitesLabel(): string {
  const { state } = useApp();
  return state.onboarding.industry?.sitesLabel || 'Teams';
}
