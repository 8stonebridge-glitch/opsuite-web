// ── Shared domain types matching backend output shapes ──

export type Role = 'owner_admin' | 'subadmin' | 'employee';
export type MembershipStatus = 'active' | 'invited' | 'suspended';
export type TaskStatus = 'Open' | 'In Progress' | 'Submitted' | 'Pending Approval' | 'Verified';
export type Priority = 'low' | 'medium' | 'critical';
export type AvailabilityType = 'leave' | 'sick' | 'off_duty';
export type AvailabilityStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type OrgMode = 'managed' | 'direct';

/** Convex document ID (opaque string at the API boundary) */
export type Id<T extends string = string> = string & { __tableName?: T };

/** Raw user document from Convex */
export interface UserDoc {
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
export interface OrganizationDoc {
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
export interface MembershipDoc {
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
export interface SiteDoc {
  _id: Id<'sites'>;
  _creationTime: number;
  organizationId: Id<'organizations'>;
  name: string;
  code?: string;
  createdAt: string;
  updatedAt: string;
}

/** Raw team document */
export interface TeamDoc {
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
export interface OrgSettingsDoc {
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
export interface HydratedTask {
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
export interface HydratedAudit {
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
export interface TaskListResult {
  scopedTasks: HydratedTask[];
  myAssignedTasks: HydratedTask[];
  auditEntries: HydratedAudit[];
}

/** Return shape of tasks.getDetail */
export interface TaskDetailResult {
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
export interface ActiveOrgResult {
  organization: OrganizationDoc;
  membership: MembershipDoc;
  settings: OrgSettingsDoc | null;
}

/** Return shape of users.viewer */
export interface ViewerResult {
  identity: {
    subject: string;
    issuer: string;
    email: string | null;
    name: string | null;
  };
  user: UserDoc | null;
}

/** Return shape of memberships.listForActiveOrganization */
export type MembershipListItem = { membership: MembershipDoc; user: UserDoc };

/** Mapped availability record */
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

/** Mapped handoff record */
export interface HandoffRecord {
  userId: string;
  date: string;
  completedAt: string;
  tasksSummary: Array<{ taskId: string; action: 'update' | 'noChange' }>;
  type: 'tasks_reviewed' | 'no_tasks';
}

/** Mapped check-in record */
export interface CheckInRecord {
  userId: string;
  date: string;
  status: 'Checked-In';
  type: string;
  checkedInAt: string;
  summary: string;
}

/** Return shape of handoffs.listForCurrentScope */
export interface HandoffListResult {
  handoffs: HandoffRecord[];
  checkIns: CheckInRecord[];
}

// ── Messaging types ──

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'failed';

export interface ConversationParticipant {
  membershipId: string;
  name: string;
  avatarUrl?: string;
}

export interface ConversationListItem {
  _id: Id<'conversations'>;
  subject?: string;
  isGroup: boolean;
  lastMessageText?: string;
  lastMessageAt?: string;
  unreadCount: number;
  participants: ConversationParticipant[];
  updatedAt: string;
}

export interface ConversationDetail {
  _id: Id<'conversations'>;
  organizationId: Id<'organizations'>;
  participantIds: Id<'memberships'>[];
  lastMessageText?: string;
  lastMessageAt?: string;
  isGroup: boolean;
  subject?: string;
  createdAt: string;
  updatedAt: string;
  participants: Array<{
    membershipId: string;
    name: string;
    avatarUrl?: string;
    isTyping: boolean;
    lastSeenAt?: string;
    isCurrentUser: boolean;
  }>;
  currentUserUnreadCount: number;
}

export interface MessageDoc {
  _id: Id<'messages'>;
  _creationTime: number;
  conversationId: Id<'conversations'>;
  organizationId: Id<'organizations'>;
  senderMembershipId: Id<'memberships'>;
  body: string;
  status: MessageStatus;
  clientId: string;
  replyToMessageId?: Id<'messages'>;
  createdAt: string;
  updatedAt: string;
  senderName: string;
  senderAvatarUrl?: string;
  isCurrentUser: boolean;
}

export interface MessageListResult {
  messages: MessageDoc[];
  hasMore: boolean;
  cursor?: string;
}

export interface PresenceEntry {
  membershipId: string;
  name: string;
  isTyping: boolean;
  isOnline: boolean;
  lastSeenAt?: string;
}

// ── Notification types ──

export type NotificationType = 'task' | 'availability' | 'handoff' | 'coverage' | 'review' | 'system';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  type: NotificationType;
  taskId?: string;
  route?: string;
  reason?: string;
  isRead: boolean;
}

export interface NotificationPrefs {
  task: boolean;
  availability: boolean;
  handoff: boolean;
  coverage: boolean;
  review: boolean;
  system: boolean;
}

/** Raw task audit document */
export interface TaskAuditDoc {
  _id: Id<'taskAudits'>;
  _creationTime: number;
  organizationId: Id<'organizations'>;
  taskId: Id<'tasks'>;
  actorMembershipId?: Id<'memberships'>;
  type: string;
  message: string;
  createdAt: string;
}

/** Return shape of metrics.dashboard */
export interface DashboardMetrics {
  totalTasks: number;
  openTasks: number;
  overdueCount: number;
  avgCompletionDays: number;
  approvalQueueSize: number;
  reworkRate: number;
  handoffComplianceRate: number;
}

/** Return shape of handoffs.myProgress */
export interface HandoffProgressResult {
  total: number;
  engaged: number;
  remainingTasks: Array<{ id: string; title: string; site: string; siteId: string }>;
  engagedTaskIds: string[];
  canComplete: boolean;
  handoffDone: boolean;
  handoff: HandoffRecord | null;
}
