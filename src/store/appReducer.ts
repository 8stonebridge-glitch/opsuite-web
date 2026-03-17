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
  AvailabilityRecord,
} from '../types';
import { getToday, getNowISO } from '../utils/date';
import { uid } from '../utils/id';
import { CATEGORIES_BY_INDUSTRY } from '../constants/categories';

// ── State ────────────────────────────────────────────────────────────

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

export const EMPTY_APP_STATE: AppState = {
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

// ── Actions ──────────────────────────────────────────────────────────

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
  | { type: 'SWITCH_ORGANIZATION'; workspaceId: string }
  | { type: 'SYNC_CONVEX_DATA'; teams: Team[]; sites: Site[]; standaloneEmployees: Employee[] };

// ── Reducer ──────────────────────────────────────────────────────────

export function appReducer(state: AppState, action: AppAction): AppState {
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
            : team,
        ),
      };
    case 'ADD_STANDALONE_EMPLOYEE':
      return { ...state, allEmployees: [...state.allEmployees, action.employee] };
    case 'REASSIGN_EMPLOYEE': {
      const emp = state.allEmployees.find((e) => e.id === action.employeeId);
      if (!emp) return state;
      const updatedEmp = {
        ...emp,
        teamId: action.newTeamId || undefined,
        teamName: action.newTeamId ? state.teams.find((t) => t.id === action.newTeamId)?.name : undefined,
        siteId: action.siteId || undefined,
        siteName: action.siteName || undefined,
      };
      const teamsWithout = state.teams.map((t) => ({
        ...t,
        members: t.members.filter((m) => m.id !== action.employeeId),
      }));
      const finalTeams = action.newTeamId
        ? teamsWithout.map((t) =>
            t.id === action.newTeamId
              ? { ...t, members: [...t.members, updatedEmp].sort((a, b) => a.name.localeCompare(b.name)) }
              : t,
          )
        : teamsWithout;
      return { ...state, teams: finalTeams };
    }
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
        ...task, status: 'In Progress', reworked: true, reworkCount: cycle,
        priority: isEscalated ? 'critical' : task.priority,
        completedAt: undefined, verifiedBy: undefined,
      };
      const newAudit: Omit<AuditEntry, 'id'>[] = [
        { taskId: action.taskId, role: action.currentRole === 'admin' ? 'Admin' : 'SubAdmin',
          message: `Rework requested by ${action.reworkedBy}: ${action.reason || 'Rework required'}. Cycle ${cycle}.`,
          createdAt: now, dateTag: today, updateType: 'Rework' },
      ];
      if (isEscalated) {
        newAudit.push({ taskId: action.taskId, role: 'System',
          message: `Escalated to CRITICAL after ${cycle} rework cycles.`,
          createdAt: now, dateTag: today, updateType: 'Escalation' });
      }
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.taskId ? updatedTask : t)),
        audit: [...state.audit, ...newAudit.map((e) => ({ ...e, id: uid() }))],
      };
    }
    case 'SET_TASKS':        return { ...state, tasks: action.tasks };
    case 'SET_AUDIT':        return { ...state, audit: action.entries };
    case 'SET_CHECKINS':     return { ...state, checkIns: action.checkIns };
    case 'SET_CATEGORIES':   return { ...state, categories: action.categories };
    case 'SET_ORG_SETTINGS': return { ...state, orgSettings: { ...state.orgSettings, ...action.settings } };
    case 'SET_ORG_MODE':     return { ...state, orgMode: action.mode };
    case 'ADD_HANDOFF':      return { ...state, handoffs: [...state.handoffs, action.handoff] };
    case 'SET_HANDOFFS':     return { ...state, handoffs: action.handoffs };
    case 'REQUEST_AVAILABILITY':
      return { ...state, availability: [...state.availability, action.record] };
    case 'APPROVE_AVAILABILITY':
      return { ...state, availability: state.availability.map((r) =>
        r.id === action.recordId ? { ...r, status: 'approved' as const, approvedById: action.approvedById, approvedAt: getNowISO() } : r) };
    case 'REJECT_AVAILABILITY':
      return { ...state, availability: state.availability.map((r) =>
        r.id === action.recordId ? { ...r, status: 'rejected' as const, approvedById: action.approvedById, approvedAt: getNowISO() } : r) };
    case 'CANCEL_AVAILABILITY':
      return { ...state, availability: state.availability.map((r) =>
        r.id === action.recordId ? { ...r, status: 'cancelled' as const } : r) };
    case 'SET_AVAILABILITY':
      return { ...state, availability: action.availability };
    case 'SWITCH_ORGANIZATION':
      return { ...state, activeWorkspaceId: action.workspaceId };
    case 'SYNC_CONVEX_DATA': {
      const teamEmployees = action.teams.flatMap((t) => [t.lead, ...t.members]);
      const allEmployeesMap = new Map<string, Employee>();
      for (const employee of [...teamEmployees, ...action.standaloneEmployees]) {
        allEmployeesMap.set(employee.id, employee);
      }
      return {
        ...state,
        teams: action.teams,
        allEmployees: Array.from(allEmployeesMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
        onboarding: { ...state.onboarding, sites: action.sites },
      };
    }
    default:
      return state;
  }
}
