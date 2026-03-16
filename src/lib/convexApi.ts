/**
 * Convex API references for the web app.
 *
 * Uses `anyApi` from convex/server which provides runtime function references
 * matching the backend's module structure. The Convex backend lives in web/convex/.
 *
 * Function signatures are tightened where the shape is clear to improve DX
 * and catch misuse at compile time.
 */
import { anyApi, type FunctionReference } from 'convex/server';

// ── Shared domain types matching backend output shapes ──

type Role = 'owner_admin' | 'subadmin' | 'employee';
type MembershipStatus = 'active' | 'invited' | 'suspended';
type TaskStatus = 'Open' | 'In Progress' | 'Submitted' | 'Pending Approval' | 'Verified';
type Priority = 'low' | 'medium' | 'critical';
type AvailabilityType = 'leave' | 'sick' | 'off_duty';
type AvailabilityStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
type OrgMode = 'managed' | 'direct';

/** Convex document ID (opaque string at the API boundary) */
type Id<T extends string = string> = string & { __tableName?: T };

/** Raw user document from Convex */
interface UserDoc {
  _id: Id<'users'>;
  _creationTime: number;
  authUserId: string;
  email: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
  activeOrganizationId?: Id<'organizations'>;
  createdAt: string;
  updatedAt: string;
}

/** Raw organization document */
interface OrganizationDoc {
  _id: Id<'organizations'>;
  _creationTime: number;
  name: string;
  slug: string;
  industryId?: string;
  mode: OrgMode;
  ownerUserId: Id<'users'>;
  createdAt: string;
  updatedAt: string;
}

/** Raw membership document */
interface MembershipDoc {
  _id: Id<'memberships'>;
  _creationTime: number;
  userId: Id<'users'>;
  organizationId: Id<'organizations'>;
  role: Role;
  siteIds: Id<'sites'>[];
  teamIds: Id<'teams'>[];
  status: MembershipStatus;
  invitedByUserId?: Id<'users'>;
  joinedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** Raw site document */
interface SiteDoc {
  _id: Id<'sites'>;
  _creationTime: number;
  organizationId: Id<'organizations'>;
  name: string;
  code?: string;
  createdAt: string;
  updatedAt: string;
}

/** Raw team document */
interface TeamDoc {
  _id: Id<'teams'>;
  _creationTime: number;
  organizationId: Id<'organizations'>;
  siteId?: Id<'sites'>;
  name: string;
  color?: string;
  subadminMembershipId?: Id<'memberships'>;
  createdAt: string;
  updatedAt: string;
}

/** Org settings document */
interface OrgSettingsDoc {
  _id: Id<'orgSettings'>;
  _creationTime: number;
  organizationId: Id<'organizations'>;
  noChangeAlertWorkdays: number;
  reworkAlertCycles: number;
  createdAt: string;
  updatedAt: string;
}

// ── Hydrated shapes returned by backend queries ──

/** Hydrated task returned by tasks.listForCurrentScope / tasks.getDetail */
interface HydratedTask {
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
  assignedByRole: 'admin' | 'subadmin' | 'employee';
  note?: string;
  approved: boolean;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  verifiedBy?: string;
  reworked: boolean;
  reworkCount: number;
  lastActivityAt: string;
  accountableLeadId?: string;
  accountableLeadName?: string;
  delegatedAt?: string;
  lastNoChangeAt?: string;
  stalledDays: number;
}

/** Hydrated audit entry */
interface HydratedAudit {
  id: string;
  taskId: string;
  role: string;
  message: string;
  createdAt: string;
  dateTag: string;
  updateType: string;
  actorName?: string;
}

/** Return shape of tasks.listForCurrentScope */
interface TaskListResult {
  scopedTasks: HydratedTask[];
  myAssignedTasks: HydratedTask[];
  auditEntries: HydratedAudit[];
}

/** Return shape of tasks.getDetail */
interface TaskDetailResult {
  task: HydratedTask;
  isAssignee: boolean;
  canApprove: boolean;
  canVerify: boolean;
  canRequestRework: boolean;
  canUpdateStatus: boolean;
  allowedNextStatuses: TaskStatus[];
  canDelegate: boolean;
  teamMembers: Array<{ membershipId: string; userId: string; name: string }>;
  audit: HydratedAudit[];
}

/** Return shape of organizations.active */
interface ActiveOrgResult {
  organization: OrganizationDoc;
  membership: MembershipDoc;
  settings: OrgSettingsDoc | null;
}

/** Return shape of users.viewer */
interface ViewerResult {
  identity: {
    subject: string;
    issuer: string;
    email: string | null;
    name: string | null;
  };
  user: UserDoc | null;
}

/** Return shape of memberships.listForActiveOrganization */
type MembershipListItem = { membership: MembershipDoc; user: UserDoc };

/** Mapped availability record */
interface AvailabilityRecord {
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

/** Mapped handoff record */
interface HandoffRecord {
  userId: string;
  date: string;
  completedAt: string;
  tasksSummary: Array<{ taskId: string; action: 'update' | 'noChange' }>;
  type: 'tasks_reviewed' | 'no_tasks';
}

/** Mapped check-in record */
interface CheckInRecord {
  userId: string;
  date: string;
  status: 'Checked-In';
  type: string;
  checkedInAt: string;
  summary: string;
}

/** Return shape of handoffs.listForCurrentScope */
interface HandoffListResult {
  handoffs: HandoffRecord[];
  checkIns: CheckInRecord[];
}

/** Return shape of handoffs.myProgress */
interface HandoffProgressResult {
  total: number;
  engaged: number;
  remainingTasks: Array<{ id: string; title: string; site: string; siteId: string }>;
  engagedTaskIds: string[];
  canComplete: boolean;
  handoffDone: boolean;
  handoff: HandoffRecord | null;
}

// ── Typed API interface ──

interface ConvexApi {
  users: {
    viewer: FunctionReference<'query', 'public', Record<string, never>, ViewerResult | null>;
    syncFromAuth: FunctionReference<'mutation', 'public', { clerkEmail?: string; clerkName?: string; clerkPhone?: string; clerkAvatarUrl?: string }, UserDoc | null>;
    syncFromAuthAction: FunctionReference<'action', 'public', Record<string, never>, unknown>;
    setActiveOrganization: FunctionReference<'mutation', 'public', { organizationId: Id<'organizations'> }, UserDoc | null>;
  };
  organizations: {
    active: FunctionReference<'query', 'public', Record<string, never>, ActiveOrgResult | null>;
    listForViewer: FunctionReference<'query', 'public', Record<string, never>, Array<{ organization: OrganizationDoc; membership: MembershipDoc; isActive: boolean } | null>>;
    create: FunctionReference<'mutation', 'public', { name: string; industryId?: string; mode: OrgMode }, { organizationId: Id<'organizations'>; membershipId: Id<'memberships'> }>;
    storeSignupDraft: FunctionReference<'mutation', 'public', { email: string; organizationName: string; industryId?: string; mode: OrgMode }, Id<'signupDrafts'>>;
    updateMode: FunctionReference<'mutation', 'public', { mode: OrgMode }, { id: Id<'organizations'>; mode: OrgMode }>;
  };
  tasks: {
    listForCurrentScope: FunctionReference<'query', 'public', Record<string, never>, TaskListResult>;
    getDetail: FunctionReference<'query', 'public', { taskId: Id<'tasks'> }, TaskDetailResult | null>;
    create: FunctionReference<'mutation', 'public', {
      title: string;
      description?: string;
      priority: Priority;
      siteId?: Id<'sites'>;
      teamId?: Id<'teams'>;
      assignedToMembershipId?: Id<'memberships'>;
      accountableLeadMembershipId: Id<'memberships'>;
      dueDate?: string;
      note?: string;
    }, unknown>;
    addNote: FunctionReference<'mutation', 'public', { taskId: Id<'tasks'>; message: string }, unknown>;
    updateStatus: FunctionReference<'mutation', 'public', { taskId: Id<'tasks'>; status: TaskStatus; note?: string }, unknown>;
    markNoChange: FunctionReference<'mutation', 'public', { taskId: Id<'tasks'> }, unknown>;
    delegate: FunctionReference<'mutation', 'public', { taskId: Id<'tasks'>; assigneeMembershipId: Id<'memberships'> }, unknown>;
    approvePending: FunctionReference<'mutation', 'public', { taskId: Id<'tasks'> }, unknown>;
    verify: FunctionReference<'mutation', 'public', { taskId: Id<'tasks'> }, unknown>;
    requestRework: FunctionReference<'mutation', 'public', { taskId: Id<'tasks'>; reason: string }, unknown>;
    migrateCompletedToSubmitted: FunctionReference<'mutation', 'public', Record<string, never>, { migrated: number }>;
  };
  memberships: {
    listForActiveOrganization: FunctionReference<'query', 'public', Record<string, never>, Array<MembershipListItem | null>>;
    createProvisionedMember: FunctionReference<'mutation', 'public', {
      name: string;
      email: string;
      phone: string;
      role: 'subadmin' | 'employee';
      siteIds: Id<'sites'>[];
      teamIds: Id<'teams'>[];
      authUserId?: string;
    }, { user: UserDoc | null; membership: MembershipDoc }>;
    removeMember: FunctionReference<'mutation', 'public', { userId: Id<'users'> }, { removed: boolean }>;
    reassignMember: FunctionReference<'mutation', 'public', { userId: Id<'users'>; teamIds: Id<'teams'>[]; siteIds: Id<'sites'>[] }, MembershipDoc>;
    updateMember: FunctionReference<'mutation', 'public', { userId: Id<'users'>; name?: string; email?: string; phone?: string }, UserDoc | null>;
    activeMembershipCountForUser: FunctionReference<'query', 'public', { userId: Id<'users'> }, number>;
  };
  sites: {
    listForActiveOrganization: FunctionReference<'query', 'public', Record<string, never>, SiteDoc[]>;
    create: FunctionReference<'mutation', 'public', { name: string; code?: string }, SiteDoc | null>;
  };
  teams: {
    listForActiveOrganization: FunctionReference<'query', 'public', Record<string, never>, TeamDoc[]>;
    create: FunctionReference<'mutation', 'public', { name: string; color?: string; siteId?: Id<'sites'>; subadminMembershipId?: Id<'memberships'> }, TeamDoc | null>;
  };
  availability: {
    listForCurrentScope: FunctionReference<'query', 'public', Record<string, never>, AvailabilityRecord[]>;
    createRequest: FunctionReference<'mutation', 'public', { type: AvailabilityType; startDate: string; endDate: string; notes?: string }, AvailabilityRecord>;
    approve: FunctionReference<'mutation', 'public', { recordId: Id<'availabilityRecords'> }, unknown>;
    reject: FunctionReference<'mutation', 'public', { recordId: Id<'availabilityRecords'> }, unknown>;
    cancel: FunctionReference<'mutation', 'public', { recordId: Id<'availabilityRecords'> }, unknown>;
  };
  handoffs: {
    myProgress: FunctionReference<'query', 'public', { date: string }, HandoffProgressResult>;
    completeForToday: FunctionReference<'mutation', 'public', { date: string }, HandoffRecord>;
    listForCurrentScope: FunctionReference<'query', 'public', Record<string, never>, HandoffListResult>;
  };
}

export const api = anyApi as unknown as ConvexApi;

// Re-export useful types for consumers
export type {
  HydratedTask,
  HydratedAudit,
  TaskListResult,
  TaskDetailResult,
  ActiveOrgResult,
  ViewerResult,
  AvailabilityRecord,
  HandoffRecord,
  CheckInRecord,
  HandoffListResult,
  HandoffProgressResult,
  MembershipListItem,
  UserDoc,
  OrganizationDoc,
  MembershipDoc,
  SiteDoc,
  TeamDoc,
  OrgSettingsDoc,
  TaskStatus,
  Priority,
  AvailabilityType,
  AvailabilityStatus,
  Role as ConvexRole,
  OrgMode,
};
