'use client';

import React, { createContext, useContext, useReducer, useMemo, type ReactNode } from 'react';
import type {
  Task,
  AuditEntry,
  CheckIn,
  Site,
  Team,
  Employee,
  Role,
  OrgMode,
  OnboardingData,
  Category,
  OrgSettings,
  HandoffRecord,
  Industry,
  Workspace,
  WorkspaceConfig,
  WorkspaceData,
  AvailabilityRecord,
} from '../types';
import { getToday, getNowISO } from '../utils/date';
import { uid } from '../utils/id';
import { CATEGORIES_BY_INDUSTRY } from '../constants/categories';
import { INDUSTRIES } from '../constants/industries';
import { generateSeedData, generateTeams, generateAvailabilityRecords } from './seed';

// ── Teams (static demo data — Apex Properties) ──────────────────────────

const makeEmps = (names: string, teamId: string, teamName: string, startIdx: number, prefix = ''): Employee[] =>
  names.split(',').map((n, i) => ({
    id: `${prefix}e${startIdx + i}`,
    name: n.trim(),
    role: 'employee' as Role,
    teamId,
    teamName,
  }));

export const TEAMS: Team[] = [
  {
    id: 't1',
    name: 'Maintenance',
    color: '#059669',
    lead: { id: 'e1', name: 'Gregory James', role: 'subadmin', teamId: 't1', teamName: 'Maintenance' },
    members: makeEmps(
      'John Doe,Mary Smith,Chidi Nwankwo,Bola Adeyemi,Fatima Yusuf,Emeka Obi,Ngozi Eze,Tunde Bakare,Halima Sani,Kunle Ojo',
      't1', 'Maintenance', 4
    ),
  },
  {
    id: 't2',
    name: 'Cleaning',
    color: '#2563eb',
    lead: { id: 'e2', name: 'Michael Ade', role: 'subadmin', teamId: 't2', teamName: 'Cleaning' },
    members: makeEmps(
      'Blessing Okoro,Yemi Alade,Samuel Okon,Grace Udo,Ibrahim Musa,Amaka Nwosu,David Ogundimu,Patience Effiong,Ahmed Bello,Chioma Igwe',
      't2', 'Cleaning', 14
    ),
  },
  {
    id: 't3',
    name: 'Security',
    color: '#7c3aed',
    lead: { id: 'e3', name: 'Samuel Obi', role: 'subadmin', teamId: 't3', teamName: 'Security' },
    members: makeEmps(
      'Musa Garba,Rita Okafor,Yakubu Danjuma,Ifeoma Chukwu,Segun Adeniyi,Hauwa Abubakar,Victor Ike,Folake Oladipo,Usman Shehu,Lilian Nkem',
      't3', 'Security', 24
    ),
  },
];

export const ALL_EMPLOYEES: Employee[] = TEAMS.flatMap((t) => [
  t.lead,
  ...t.members,
]);

// ── Public State Shape ───────────────────────────────────────────────────

export interface AppState {
  onboardingComplete: boolean;
  onboarding: OnboardingData;
  role: Role;
  userId: string | null;
  tasks: Task[];
  audit: AuditEntry[];
  checkIns: CheckIn[];
  categories: Category[];
  orgSettings: OrgSettings;
  handoffs: HandoffRecord[];
  availability: AvailabilityRecord[];
  teams: Team[];
  allEmployees: Employee[];
  orgMode: 'managed' | 'direct';
  workspaces: { id: string; orgName: string; industry: Industry | null }[];
  activeWorkspaceId: string;
}

// ── Internal State (workspace registry) ─────────────────────────────────

interface InternalState {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  role: Role;
  userId: string | null;
  onboardingComplete: boolean;
}

// ── Projection: InternalState → AppState ────────────────────────────────

const EMPTY_APP_STATE: AppState = {
  onboardingComplete: false,
  onboarding: { orgName: '', industry: null, adminName: '', sites: [] },
  role: 'admin',
  userId: null,
  tasks: [],
  audit: [],
  checkIns: [],
  categories: [],
  orgSettings: { noChangeAlertWorkdays: 3, reworkAlertCycles: 3 },
  handoffs: [],
  availability: [],
  teams: [],
  allEmployees: [],
  orgMode: 'managed',
  workspaces: [],
  activeWorkspaceId: '',
};

function projectState(internal: InternalState): AppState {
  const ws = internal.workspaces.find((w) => w.id === internal.activeWorkspaceId)
    || internal.workspaces[0];

  if (!ws) {
    return { ...EMPTY_APP_STATE };
  }

  const teamEmployees = ws.data.teams.flatMap((t) => [t.lead, ...t.members]);
  const teamEmployeeIds = new Set(teamEmployees.map((e) => e.id));
  const standaloneEmployees = (ws.data.standaloneEmployees || []).filter(
    (e) => !teamEmployeeIds.has(e.id)
  );
  const allEmployees = [...teamEmployees, ...standaloneEmployees];

  return {
    onboardingComplete: internal.onboardingComplete,
    onboarding: {
      orgName: ws.config.orgName,
      industry: ws.config.industry,
      adminName: ws.config.adminName,
      sites: ws.config.sites,
    },
    role: internal.role,
    userId: internal.userId,
    tasks: ws.data.tasks,
    audit: ws.data.audit,
    checkIns: ws.data.checkIns,
    categories: ws.data.categories,
    orgSettings: ws.config.orgSettings,
    handoffs: ws.data.handoffs,
    availability: ws.data.availability,
    teams: ws.data.teams,
    allEmployees,
    orgMode: ws.config.orgMode || 'managed',
    workspaces: internal.workspaces.map((w) => ({
      id: w.id,
      orgName: w.config.orgName,
      industry: w.config.industry,
    })),
    activeWorkspaceId: ws.id,
  };
}

// ── Write-back: after flat reducer runs, diff and update active workspace ──

function writeBackToWorkspace(
  internal: InternalState,
  before: AppState,
  after: AppState
): InternalState {
  if (before === after) return internal;

  const wsIndex = internal.workspaces.findIndex((w) => w.id === internal.activeWorkspaceId);
  if (wsIndex < 0) return internal;

  const ws = internal.workspaces[wsIndex];
  let configChanged = false;
  let dataChanged = false;

  const newConfig: WorkspaceConfig = { ...ws.config };
  if (after.onboarding.orgName !== before.onboarding.orgName) { newConfig.orgName = after.onboarding.orgName; configChanged = true; }
  if (after.onboarding.industry !== before.onboarding.industry) { newConfig.industry = after.onboarding.industry; configChanged = true; }
  if (after.onboarding.adminName !== before.onboarding.adminName) { newConfig.adminName = after.onboarding.adminName; configChanged = true; }
  if (after.onboarding.sites !== before.onboarding.sites) { newConfig.sites = after.onboarding.sites; configChanged = true; }
  if (after.orgSettings !== before.orgSettings) { newConfig.orgSettings = after.orgSettings; configChanged = true; }
  if (after.orgMode !== before.orgMode) { newConfig.orgMode = after.orgMode; configChanged = true; }

  const newData: WorkspaceData = { ...ws.data };
  if (after.tasks !== before.tasks) { newData.tasks = after.tasks; dataChanged = true; }
  if (after.audit !== before.audit) { newData.audit = after.audit; dataChanged = true; }
  if (after.checkIns !== before.checkIns) { newData.checkIns = after.checkIns; dataChanged = true; }
  if (after.handoffs !== before.handoffs) { newData.handoffs = after.handoffs; dataChanged = true; }
  if (after.categories !== before.categories) { newData.categories = after.categories; dataChanged = true; }
  if (after.teams !== before.teams) { newData.teams = after.teams; dataChanged = true; }
  if (after.availability !== before.availability) { newData.availability = after.availability; dataChanged = true; }

  if (!configChanged && !dataChanged) {
    return {
      ...internal,
      role: after.role,
      userId: after.userId,
      onboardingComplete: after.onboardingComplete,
    };
  }

  const updatedWs: Workspace = {
    ...ws,
    config: configChanged ? newConfig : ws.config,
    data: dataChanged ? newData : ws.data,
  };

  const updatedWorkspaces = [...internal.workspaces];
  updatedWorkspaces[wsIndex] = updatedWs;

  return {
    ...internal,
    workspaces: updatedWorkspaces,
    role: after.role,
    userId: after.userId,
    onboardingComplete: after.onboardingComplete,
  };
}

// ── Demo seed ─────────────────────────────────────────────────────────

const DEMO_INDUSTRY: Industry = { id: 'fm', name: 'Facility Management', sitesLabel: 'Properties', color: '#059669' };
const DEMO_SITES: Site[] = [
  { id: 's1', name: 'Lekki Tower' },
  { id: 's2', name: 'Victoria Hub' },
];
const DEMO_ADMIN = 'Sunday Okeke';
const DEMO_CATS = (CATEGORIES_BY_INDUSTRY[DEMO_INDUSTRY.id] || []).map((name, i) => ({ id: String(i + 1), name }));
const DEMO_SEED = generateSeedData(DEMO_INDUSTRY.id, DEMO_SITES, DEMO_ADMIN);

function buildApexWorkspace(): Workspace {
  return {
    id: 'ws-apex',
    ownerId: 'demo-owner',
    config: {
      orgName: 'Apex Properties',
      industry: DEMO_INDUSTRY,
      adminName: DEMO_ADMIN,
      sites: DEMO_SITES,
      orgSettings: { noChangeAlertWorkdays: 3, reworkAlertCycles: 3 },
      orgMode: 'managed',
    },
    data: {
      tasks: DEMO_SEED.tasks,
      audit: DEMO_SEED.audit,
      checkIns: DEMO_SEED.checkIns,
      handoffs: DEMO_SEED.handoffs,
      categories: DEMO_CATS,
      teams: TEAMS,
      availability: generateAvailabilityRecords(TEAMS, 'ws-apex'),
      standaloneEmployees: [],
    },
  };
}

function buildSkylineWorkspace(): Workspace {
  const industry: Industry = { id: 'construction', name: 'Construction', sitesLabel: 'Projects', color: '#d97706' };
  const sites: Site[] = [
    { id: 'sky-s1', name: 'Downtown Tower' },
    { id: 'sky-s2', name: 'Marina Bridge' },
  ];
  const teams = generateTeams([
    {
      name: 'Structural',
      color: '#d97706',
      leadName: 'Adamu Bello',
      memberNames: ['Tola Adeyinka', 'Kemi Bankole', 'Olu Fashanu', 'Bisi Coker', 'Dayo Olatunde', 'Aisha Garba', 'Femi Ajibola', 'Ngozi Ike'],
    },
    {
      name: 'MEP',
      color: '#0891b2',
      leadName: 'Chidera Okonkwo',
      memberNames: ['Ifeanyi Uche', 'Funke Adebayo', 'Babajide Ogun', 'Zainab Abubakar', 'Ade Martins', 'Chiamaka Eze', 'Rotimi Lawal', 'Hassana Sule'],
    },
  ], 'sky-');
  const cats = (CATEGORIES_BY_INDUSTRY[industry.id] || []).map((name, i) => ({ id: `sky-c${i + 1}`, name }));
  const seed = generateSeedData(industry.id, sites, DEMO_ADMIN, teams);
  return {
    id: 'ws-skyline',
    ownerId: 'demo-owner',
    config: {
      orgName: 'Skyline Construction',
      industry,
      adminName: DEMO_ADMIN,
      sites,
      orgSettings: { noChangeAlertWorkdays: 2, reworkAlertCycles: 2 },
      orgMode: 'managed',
    },
    data: {
      tasks: seed.tasks,
      audit: seed.audit,
      checkIns: seed.checkIns,
      handoffs: seed.handoffs,
      categories: cats,
      teams,
      availability: generateAvailabilityRecords(teams, 'ws-skyline'),
      standaloneEmployees: [],
    },
  };
}

function buildHarborWorkspace(): Workspace {
  const industry: Industry = { id: 'hospitality', name: 'Hospitality', sitesLabel: 'Hotels', color: '#7c3aed' };
  const sites: Site[] = [
    { id: 'har-s1', name: 'Grand Plaza Hotel' },
    { id: 'har-s2', name: 'Riverside Inn' },
  ];
  const teams = generateTeams([
    {
      name: 'Housekeeping',
      color: '#ec4899',
      leadName: 'Folashade Ojo',
      memberNames: ['Ada Nwobi', 'Temitope Osei', 'Uchenna Nweke', 'Mariam Yusuf', 'Sola Adeniran', 'Janet Ekpo', 'Gbenga Olamide', 'Hadiza Musa'],
    },
    {
      name: 'Front Desk',
      color: '#6366f1',
      leadName: 'Emmanuel Obi',
      memberNames: ['Chidinma Ani', 'Abdullahi Idris', 'Mercy Ogbonna', 'Kelvin Asare', 'Bunmi Oladipo', 'Safiya Danladi', 'Tochukwu Ibe', 'Vivian Essien'],
    },
  ], 'har-');
  const cats = (CATEGORIES_BY_INDUSTRY[industry.id] || []).map((name, i) => ({ id: `har-c${i + 1}`, name }));
  const seed = generateSeedData(industry.id, sites, DEMO_ADMIN, teams);
  return {
    id: 'ws-harbor',
    ownerId: 'demo-owner',
    config: {
      orgName: 'Harbor Hotels',
      industry,
      adminName: DEMO_ADMIN,
      sites,
      orgSettings: { noChangeAlertWorkdays: 3, reworkAlertCycles: 3 },
      orgMode: 'managed',
    },
    data: {
      tasks: seed.tasks,
      audit: seed.audit,
      checkIns: seed.checkIns,
      handoffs: seed.handoffs,
      categories: cats,
      teams,
      availability: generateAvailabilityRecords(teams, 'ws-harbor'),
      standaloneEmployees: [],
    },
  };
}

const initialInternalState: InternalState = {
  workspaces: [buildApexWorkspace(), buildSkylineWorkspace(), buildHarborWorkspace()],
  activeWorkspaceId: 'ws-apex',
  role: 'admin',
  userId: null,
  onboardingComplete: true,
};

// ── Actions ────────────────────────────────────────────────────────────

export type AppAction =
  | { type: 'SET_ORG_NAME'; name: string }
  | { type: 'SET_INDUSTRY'; industry: OnboardingData['industry'] }
  | { type: 'SET_ADMIN_NAME'; name: string }
  | { type: 'ADD_SITE'; site: Site }
  | { type: 'REMOVE_SITE'; siteId: string }
  | { type: 'ADD_TEAM'; team: Team }
  | { type: 'ADD_MEMBER_TO_TEAM'; teamId: string; member: Employee }
  | { type: 'ADD_STANDALONE_EMPLOYEE'; employee: Employee }
  | { type: 'REASSIGN_EMPLOYEE'; employeeId: string; newTeamId?: string; siteId?: string; siteName?: string }
  | { type: 'FINISH_ONBOARDING' }
  | { type: 'SWITCH_USER'; role: Role; userId: string | null }
  | { type: 'ADD_TASK'; task: Task }
  | { type: 'UPDATE_TASK'; taskId: string; updates: Partial<Task> }
  | { type: 'ADD_AUDIT'; entry: Omit<AuditEntry, 'id'> }
  | { type: 'ADD_CHECKIN'; checkIn: CheckIn }
  | { type: 'REWORK_TASK'; taskId: string; reason: string; reworkedBy: string; currentRole: Role }
  | { type: 'SET_TASKS'; tasks: Task[] }
  | { type: 'SET_AUDIT'; entries: AuditEntry[] }
  | { type: 'SET_CHECKINS'; checkIns: CheckIn[] }
  | { type: 'SET_CATEGORIES'; categories: Category[] }
  | { type: 'SET_ORG_SETTINGS'; settings: Partial<OrgSettings> }
  | { type: 'SET_ORG_MODE'; mode: OrgMode }
  | { type: 'ADD_HANDOFF'; handoff: HandoffRecord }
  | { type: 'SET_HANDOFFS'; handoffs: HandoffRecord[] }
  | { type: 'REQUEST_AVAILABILITY'; record: AvailabilityRecord }
  | { type: 'APPROVE_AVAILABILITY'; recordId: string; approvedById: string }
  | { type: 'REJECT_AVAILABILITY'; recordId: string; approvedById: string }
  | { type: 'CANCEL_AVAILABILITY'; recordId: string }
  | { type: 'SET_AVAILABILITY'; availability: AvailabilityRecord[] }
  | { type: 'SWITCH_ORGANIZATION'; workspaceId: string };

// ── Flat reducer (operates on projected AppState) ──

type InternalOnlyAction =
  | { type: 'SWITCH_ORGANIZATION' }
  | { type: 'ADD_STANDALONE_EMPLOYEE' }
  | { type: 'REASSIGN_EMPLOYEE' };

function flatReducer(state: AppState, action: Exclude<AppAction, InternalOnlyAction>): AppState {
  switch (action.type) {
    case 'SET_ORG_NAME':
      return { ...state, onboarding: { ...state.onboarding, orgName: action.name } };
    case 'SET_INDUSTRY':
      return { ...state, onboarding: { ...state.onboarding, industry: action.industry } };
    case 'SET_ADMIN_NAME':
      return { ...state, onboarding: { ...state.onboarding, adminName: action.name } };
    case 'ADD_SITE':
      return { ...state, onboarding: { ...state.onboarding, sites: [...state.onboarding.sites, action.site] } };
    case 'REMOVE_SITE':
      return { ...state, onboarding: { ...state.onboarding, sites: state.onboarding.sites.filter((s) => s.id !== action.siteId) } };
    case 'ADD_TEAM':
      return { ...state, teams: [...state.teams, action.team] };
    case 'ADD_MEMBER_TO_TEAM':
      return {
        ...state,
        teams: state.teams.map((team) =>
          team.id === action.teamId
            ? { ...team, members: [...team.members, action.member].sort((a, b) => a.name.localeCompare(b.name)) }
            : team
        ),
      };
    case 'FINISH_ONBOARDING': {
      const indId = state.onboarding.industry?.id || '';
      const catNames = CATEGORIES_BY_INDUSTRY[indId] || [];
      const categories = catNames.map((name, i) => ({ id: String(i + 1), name }));
      return { ...state, onboardingComplete: true, categories };
    }
    case 'SWITCH_USER':
      return { ...state, role: action.role, userId: action.userId };
    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.task] };
    case 'UPDATE_TASK':
      return { ...state, tasks: state.tasks.map((t) => t.id === action.taskId ? { ...t, ...action.updates } : t) };
    case 'ADD_AUDIT':
      return { ...state, audit: [...state.audit, { ...action.entry, id: uid() }] };
    case 'ADD_CHECKIN':
      return { ...state, checkIns: [...state.checkIns, action.checkIn] };
    case 'REWORK_TASK': {
      const task = state.tasks.find((t) => t.id === action.taskId);
      if (!task) return state;
      const cycle = (task.reworkCount || 0) + 1;
      const isEscalated = cycle >= state.orgSettings.reworkAlertCycles;
      const today = getToday();
      const now = getNowISO();
      const updatedTask: Task = {
        ...task,
        status: 'In Progress',
        reworked: true,
        reworkCount: cycle,
        priority: isEscalated ? 'critical' : task.priority,
        completedAt: undefined,
        verifiedBy: undefined,
      };
      const newAudit: Omit<AuditEntry, 'id'>[] = [
        {
          taskId: action.taskId,
          role: action.currentRole === 'admin' ? 'Admin' : 'SubAdmin',
          message: `Rework requested by ${action.reworkedBy}: ${action.reason || 'Rework required'}. Cycle ${cycle}.`,
          createdAt: now,
          dateTag: today,
          updateType: 'Rework',
        },
      ];
      if (isEscalated) {
        newAudit.push({
          taskId: action.taskId,
          role: 'System',
          message: `Escalated to CRITICAL after ${cycle} rework cycles.`,
          createdAt: now,
          dateTag: today,
          updateType: 'Escalation',
        });
      }
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.taskId ? updatedTask : t)),
        audit: [...state.audit, ...newAudit.map((e) => ({ ...e, id: uid() }))],
      };
    }
    case 'SET_TASKS':
      return { ...state, tasks: action.tasks };
    case 'SET_AUDIT':
      return { ...state, audit: action.entries };
    case 'SET_CHECKINS':
      return { ...state, checkIns: action.checkIns };
    case 'SET_CATEGORIES':
      return { ...state, categories: action.categories };
    case 'SET_ORG_SETTINGS':
      return { ...state, orgSettings: { ...state.orgSettings, ...action.settings } };
    case 'SET_ORG_MODE':
      return { ...state, orgMode: action.mode };
    case 'ADD_HANDOFF':
      return { ...state, handoffs: [...state.handoffs, action.handoff] };
    case 'SET_HANDOFFS':
      return { ...state, handoffs: action.handoffs };
    case 'REQUEST_AVAILABILITY':
      return { ...state, availability: [...state.availability, action.record] };
    case 'APPROVE_AVAILABILITY':
      return {
        ...state,
        availability: state.availability.map((r) =>
          r.id === action.recordId
            ? { ...r, status: 'approved' as const, approvedById: action.approvedById, approvedAt: getNowISO() }
            : r
        ),
      };
    case 'REJECT_AVAILABILITY':
      return {
        ...state,
        availability: state.availability.map((r) =>
          r.id === action.recordId
            ? { ...r, status: 'rejected' as const, approvedById: action.approvedById, approvedAt: getNowISO() }
            : r
        ),
      };
    case 'CANCEL_AVAILABILITY':
      return {
        ...state,
        availability: state.availability.map((r) =>
          r.id === action.recordId ? { ...r, status: 'cancelled' as const } : r
        ),
      };
    case 'SET_AVAILABILITY':
      return { ...state, availability: action.availability };
    default:
      return state;
  }
}

// ── Wrapper reducer (operates on InternalState) ─────────────────────────

function internalReducer(internal: InternalState, action: AppAction): InternalState {
  if (action.type === 'SWITCH_ORGANIZATION') {
    return { ...internal, activeWorkspaceId: action.workspaceId };
  }

  if (action.type === 'ADD_STANDALONE_EMPLOYEE') {
    const wsIndex = internal.workspaces.findIndex((w) => w.id === internal.activeWorkspaceId);
    if (wsIndex < 0) return internal;
    const ws = internal.workspaces[wsIndex];
    const existing = ws.data.standaloneEmployees || [];
    const updatedWs: Workspace = { ...ws, data: { ...ws.data, standaloneEmployees: [...existing, action.employee] } };
    const nextWorkspaces = [...internal.workspaces];
    nextWorkspaces[wsIndex] = updatedWs;
    return { ...internal, workspaces: nextWorkspaces };
  }

  if (action.type === 'REASSIGN_EMPLOYEE') {
    const wsIndex = internal.workspaces.findIndex((w) => w.id === internal.activeWorkspaceId);
    if (wsIndex < 0) return internal;
    const ws = internal.workspaces[wsIndex];
    const allMembers = [...ws.data.teams.flatMap((t) => t.members), ...(ws.data.standaloneEmployees || [])];
    const emp = allMembers.find((m) => m.id === action.employeeId);
    if (!emp) return internal;

    const updatedEmp = {
      ...emp,
      teamId: action.newTeamId || undefined,
      teamName: action.newTeamId ? ws.data.teams.find((t) => t.id === action.newTeamId)?.name : undefined,
      siteId: action.siteId || undefined,
      siteName: action.siteName || undefined,
    };

    const teamsWithout = ws.data.teams.map((t) => ({ ...t, members: t.members.filter((m) => m.id !== action.employeeId) }));
    const standaloneWithout = (ws.data.standaloneEmployees || []).filter((e) => e.id !== action.employeeId);

    const finalTeams = action.newTeamId
      ? teamsWithout.map((t) =>
          t.id === action.newTeamId
            ? { ...t, members: [...t.members, updatedEmp].sort((a, b) => a.name.localeCompare(b.name)) }
            : t
        )
      : teamsWithout;
    const finalStandalone = !action.newTeamId
      ? [...standaloneWithout, updatedEmp].sort((a, b) => a.name.localeCompare(b.name))
      : standaloneWithout;

    const updatedWs: Workspace = { ...ws, data: { ...ws.data, teams: finalTeams, standaloneEmployees: finalStandalone } };
    const nextWorkspaces = [...internal.workspaces];
    nextWorkspaces[wsIndex] = updatedWs;
    return { ...internal, workspaces: nextWorkspaces };
  }

  // For all other actions: project → run flat reducer → write back
  const projectedBefore = projectState(internal);
  const projectedAfter = flatReducer(projectedBefore, action);
  return writeBackToWorkspace(internal, projectedBefore, projectedAfter);
}

// ── Context ────────────────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [internal, dispatch] = useReducer(internalReducer, initialInternalState);
  const state = useMemo(() => projectState(internal), [internal]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
