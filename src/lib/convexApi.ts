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
import type {
  Id,
  Role,
  OrgMode,
  Priority,
  TaskStatus,
  AvailabilityType,
  UserDoc,
  OrganizationDoc,
  MembershipDoc,
  SiteDoc,
  TeamDoc,
  OrgSettingsDoc,
  HydratedTask,
  HydratedAudit,
  TaskListResult,
  TaskDetailResult,
  ActiveOrgResult,
  ViewerResult,
  MembershipListItem,
  AvailabilityRecord,
  HandoffRecord,
  HandoffListResult,
  HandoffProgressResult,
  ConversationListItem,
  ConversationDetail,
  MessageListResult,
  PresenceEntry,
  NotificationItem,
  NotificationPrefs,
  TaskAuditDoc,
  DashboardMetrics,
} from './convexApiTypes';

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
    bulkApprove: FunctionReference<'mutation', 'public', { taskIds: Id<'tasks'>[] }, { approved: number }>;
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
  orgSettings: {
    update: FunctionReference<'mutation', 'public', { organizationId: Id<'organizations'>; noChangeAlertWorkdays?: number; reworkAlertCycles?: number }, OrgSettingsDoc | null>;
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
  conversations: {
    list: FunctionReference<'query', 'public', Record<string, never>, ConversationListItem[]>;
    get: FunctionReference<'query', 'public', { conversationId: Id<'conversations'> }, ConversationDetail>;
    create: FunctionReference<'mutation', 'public', { participantMembershipIds: Id<'memberships'>[]; subject?: string }, Id<'conversations'>>;
  };
  messages: {
    list: FunctionReference<'query', 'public', { conversationId: Id<'conversations'>; limit?: number; before?: string }, MessageListResult>;
    send: FunctionReference<'mutation', 'public', { conversationId: Id<'conversations'>; body: string; clientId: string; replyToMessageId?: Id<'messages'> }, Id<'messages'>>;
    markAsRead: FunctionReference<'mutation', 'public', { conversationId: Id<'conversations'> }, void>;
  };
  presence: {
    setTyping: FunctionReference<'mutation', 'public', { conversationId: Id<'conversations'>; isTyping: boolean }, void>;
    updateLastSeen: FunctionReference<'mutation', 'public', { conversationId: Id<'conversations'> }, void>;
    getPresence: FunctionReference<'query', 'public', { conversationId: Id<'conversations'> }, PresenceEntry[]>;
  };
  taskAudits: {
    listForOrganization: FunctionReference<'query', 'public', Record<string, never>, TaskAuditDoc[]>;
  };
  metrics: {
    dashboard: FunctionReference<'query', 'public', Record<string, never>, DashboardMetrics>;
  };
  notifications: {
    list: FunctionReference<'query', 'public', { limit?: number }, NotificationItem[]>;
    unreadCount: FunctionReference<'query', 'public', Record<string, never>, number>;
    markRead: FunctionReference<'mutation', 'public', { notificationId: Id<'notifications'> }, void>;
    markAllRead: FunctionReference<'mutation', 'public', Record<string, never>, void>;
    dismiss: FunctionReference<'mutation', 'public', { notificationId: Id<'notifications'> }, void>;
    getPreferences: FunctionReference<'query', 'public', Record<string, never>, NotificationPrefs>;
    updatePreferences: FunctionReference<'mutation', 'public', { task: boolean; availability: boolean; handoff: boolean; coverage: boolean; review: boolean; system: boolean }, void>;
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
  NotificationItem,
  TaskAuditDoc,
  DashboardMetrics,
} from './convexApiTypes';
