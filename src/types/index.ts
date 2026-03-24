export type Role = 'admin' | 'subadmin' | 'employee';

/** Clerk organization role keys */
export type ClerkRole =
  | 'org:owner_admin'
  | 'org:admin'
  | 'org:subadmin'
  | 'org:employee'
  | 'owner_admin'
  | 'admin'
  | 'subadmin'
  | 'employee';

/** Map Clerk org role to app-level Role */
export function clerkRoleToAppRole(clerkRole: string): Role | null {
  switch (clerkRole) {
    case 'admin':
    case 'org:admin':
    case 'owner_admin':
    case 'org:owner_admin': return 'admin';
    case 'subadmin':
    case 'org:subadmin': return 'subadmin';
    case 'employee':
    case 'org:employee': return 'employee';
    default: return null;
  }
}

/** Organization management mode: 'managed' has subadmin leads, 'direct' is admin→employees */
export type OrgMode = 'managed' | 'direct';

export type FilterValue = 'active' | 'review' | 'done';

export type TaskStatus =
  | 'Open'
  | 'In Progress'
  | 'Submitted'
  | 'Pending Approval'
  | 'Verified';

export type Priority = 'low' | 'medium' | 'critical';

export interface Site {
  id: string;
  name: string;
}

export interface Employee {
  id: string;
  name: string;
  role: Role;
  email?: string;
  phone?: string;
  teamId?: string;
  teamName?: string;
  siteId?: string;
  siteName?: string;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  siteId?: string;
  lead: Employee;
  members: Employee[];
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  site: string;
  siteId: string;
  category?: string;
  priority: Priority;
  due: string | null;
  assignee: string;
  assigneeId: string;
  teamId: string;
  status: TaskStatus;
  assignedBy: string;
  assignedByRole: Role;
  note?: string;
  approved: boolean;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  verifiedBy?: string;
  reworked?: boolean;
  reworkCount?: number;
  lastActivityAt?: string;
  accountableLeadId?: string;
  accountableLeadName?: string;
  delegatedAt?: string;
  lastNoChangeAt?: string;
  stalledDays?: number;
}

export interface AuditEntry {
  id: string;
  taskId: string | null;
  role: string;
  message: string;
  createdAt: string;
  dateTag: string;
  updateType: string;
}

export interface CheckIn {
  userId: string;
  date: string;
  status: 'Checked-In' | 'Missed';
  type: string | null;
  checkedInAt: string | null;
  summary: string | null;
}

export interface Industry {
  id: string;
  name: string;
  sitesLabel: string;
  color: string;
}

export interface OnboardingData {
  orgName: string;
  industry: Industry | null;
  adminName: string;
  sites: Site[];
}

export interface Category {
  id: string;
  name: string;
}

export interface WorkspaceConfig {
  orgName: string;
  industry: Industry | null;
  adminName: string;
  sites: Site[];
  orgSettings: OrgSettings;
  orgMode: OrgMode;
}

export interface WorkspaceData {
  tasks: Task[];
  audit: AuditEntry[];
  checkIns: CheckIn[];
  handoffs: HandoffRecord[];
  categories: Category[];
  teams: Team[];
  availability: AvailabilityRecord[];
  standaloneEmployees?: Employee[];
}

export interface Workspace {
  id: string;
  ownerId: string;
  config: WorkspaceConfig;
  data: WorkspaceData;
}

export type TaskBucket = 'active' | 'review' | 'done';
export type ActiveGroup = 'overdue' | 'stalled' | 'reworked' | 'inProgress' | 'unstarted';

export type ScoreBand = 'green' | 'amber' | 'red';

export interface EmployeePerformanceMetrics {
  overdueRate: number;
  staleActiveCount: number;
  onTimeCompletionRate: number;
  criticalResponseRate: number;
  checkInComplianceRate: number;
  updateConsistencyRate: number;
  reworkRate: number;
  handoffResponseRate: number;
}

export interface EmployeeActionItem {
  id: string;
  severity: ScoreBand;
  label: string;
  count: number;
  target: string;
  route?: string;
}

export interface EmployeePerformance {
  employeeId: string;
  managerId: string;
  score: number;
  band: ScoreBand;
  trendDelta: number;
  metrics: EmployeePerformanceMetrics;
  actions: EmployeeActionItem[];
  windowStart: string;
  windowEnd: string;
}

export interface SubadminPerformance {
  subadminId: string;
  teamId: string;
  score: number;
  band: ScoreBand;
  trendDelta: number;
  employeeScores: { employeeId: string; score: number; band: ScoreBand }[];
  atRiskCount: number;
  actions: EmployeeActionItem[];
  windowStart: string;
  windowEnd: string;
}

export interface OrgSettings {
  noChangeAlertWorkdays: number;
  reworkAlertCycles: number;
}

export interface HandoffTaskSummary {
  taskId: string;
  action: 'update' | 'noChange';
}

export interface HandoffRecord {
  userId: string;
  date: string;
  completedAt: string;
  tasksSummary: HandoffTaskSummary[];
  type: 'tasks_reviewed' | 'no_tasks';
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  type: 'task' | 'availability' | 'handoff' | 'coverage' | 'review' | 'system';
  taskId?: string;
  route?: string;
}

export type AvailabilityType = 'leave' | 'sick' | 'off_duty';
export type AvailabilityStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface AvailabilityRecord {
  id: string;
  organizationId: string;
  memberId: string;
  type: AvailabilityType;
  status: AvailabilityStatus;
  startDate: string;
  endDate: string;
  notes: string;
  requestedById: string;
  approvedById: string | null;
  createdAt: string;
  approvedAt: string | null;
}
