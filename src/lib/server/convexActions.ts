/**
 * Server-side helpers for calling Convex mutations from Next.js API routes.
 * Resolves Convex Auth session, gets an auth token, and calls the appropriate mutation.
 *
 * These helpers resolve userId → membershipId server-side so the frontend
 * never needs to know about membership IDs.
 */
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchMutation, fetchQuery } from 'convex/nextjs';
import { api } from '@/lib/convexApi';

export class ConvexActionError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Resolve the Convex Auth session and obtain a Convex token.
 * Returns the token and active organization context (membership, org, etc.)
 */
export async function requireAuthContext() {
  const token = await convexAuthNextjsToken();

  if (!token) {
    throw new ConvexActionError(401, 'You need to be signed in.');
  }

  const active = await fetchQuery(api.organizations.active, {}, { token });
  if (!active?.membership) {
    throw new ConvexActionError(403, 'No active organization is selected.');
  }

  return { token, active };
}

/**
 * Given a userId (from users table), resolve the membershipId by looking
 * through the active organization's membership list.
 */
export async function resolveMembershipId(token: string, userId: string): Promise<string> {
  const members = await fetchQuery(
    api.memberships.listForActiveOrganization,
    {},
    { token },
  ) as Array<{ membership: { _id: string }; user: { _id: string } }>;

  const match = members.find((entry) => String(entry.user._id) === userId);
  if (!match) {
    throw new ConvexActionError(404, 'Could not find a membership for that user.');
  }

  return String(match.membership._id);
}

// ─── Task Actions ───────────────────────────────────────────────────

export async function createTask(params: {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'critical';
  siteId?: string;
  teamId?: string;
  assigneeUserId?: string;
  dueDate?: string;
  note?: string;
}) {
  const { token, active } = await requireAuthContext();
  const membership = active.membership;

  // Resolve assignee userId → membershipId
  let assignedToMembershipId: string | undefined;
  if (params.assigneeUserId) {
    assignedToMembershipId = await resolveMembershipId(token, params.assigneeUserId);
  }

  // The accountable lead is the current user's membership for subadmins,
  // or the assignee's lead. For admin, it's their own membership.
  const accountableLeadMembershipId = String(membership._id);

  const result = await fetchMutation(
    api.tasks.create,
    {
      title: params.title,
      description: params.description,
      priority: params.priority,
      siteId: params.siteId || undefined,
      teamId: params.teamId || undefined,
      assignedToMembershipId: assignedToMembershipId || undefined,
      accountableLeadMembershipId,
      dueDate: params.dueDate,
      note: params.note,
    },
    { token },
  );

  return result;
}

export async function updateTaskStatus(params: {
  taskId: string;
  status: 'Open' | 'In Progress' | 'Submitted' | 'Pending Approval' | 'Verified';
  note?: string;
}) {
  const { token } = await requireAuthContext();

  const result = await fetchMutation(
    api.tasks.updateStatus,
    {
      taskId: params.taskId,
      status: params.status,
      note: params.note,
    },
    { token },
  );

  return result;
}

export async function addTaskNote(params: {
  taskId: string;
  message: string;
}) {
  const { token } = await requireAuthContext();

  const result = await fetchMutation(
    api.tasks.addNote,
    {
      taskId: params.taskId,
      message: params.message,
    },
    { token },
  );

  return result;
}

export async function markTaskNoChange(params: { taskId: string }) {
  const { token } = await requireAuthContext();

  const result = await fetchMutation(
    api.tasks.markNoChange,
    { taskId: params.taskId },
    { token },
  );

  return result;
}

export async function delegateTask(params: {
  taskId: string;
  assigneeUserId: string;
}) {
  const { token } = await requireAuthContext();
  const assigneeMembershipId = await resolveMembershipId(token, params.assigneeUserId);

  const result = await fetchMutation(
    api.tasks.delegate,
    {
      taskId: params.taskId,
      assigneeMembershipId,
    },
    { token },
  );

  return result;
}

export async function approveTask(params: { taskId: string }) {
  const { token } = await requireAuthContext();

  const result = await fetchMutation(
    api.tasks.approvePending,
    { taskId: params.taskId },
    { token },
  );

  return result;
}

export async function verifyTask(params: { taskId: string }) {
  const { token } = await requireAuthContext();

  const result = await fetchMutation(
    api.tasks.verify,
    { taskId: params.taskId },
    { token },
  );

  return result;
}

export async function requestTaskRework(params: {
  taskId: string;
  reason: string;
}) {
  const { token } = await requireAuthContext();

  const result = await fetchMutation(
    api.tasks.requestRework,
    {
      taskId: params.taskId,
      reason: params.reason,
    },
    { token },
  );

  return result;
}

// ─── Handoff Actions ────────────────────────────────────────────────

export async function completeHandoff(params: { date: string }) {
  const { token } = await requireAuthContext();

  const result = await fetchMutation(
    api.handoffs.completeForToday,
    { date: params.date },
    { token },
  );

  return result;
}

// ─── Availability Actions ───────────────────────────────────────────

export async function createAvailabilityRequest(params: {
  type: 'leave' | 'sick' | 'off_duty';
  startDate: string;
  endDate: string;
  notes?: string;
}) {
  const { token } = await requireAuthContext();

  const result = await fetchMutation(
    api.availability.createRequest,
    {
      type: params.type,
      startDate: params.startDate,
      endDate: params.endDate,
      notes: params.notes,
    },
    { token },
  );

  return result;
}

export async function approveAvailability(params: { recordId: string }) {
  const { token } = await requireAuthContext();

  const result = await fetchMutation(
    api.availability.approve,
    { recordId: params.recordId },
    { token },
  );

  return result;
}

export async function rejectAvailability(params: { recordId: string }) {
  const { token } = await requireAuthContext();

  const result = await fetchMutation(
    api.availability.reject,
    { recordId: params.recordId },
    { token },
  );

  return result;
}

export async function cancelAvailability(params: { recordId: string }) {
  const { token } = await requireAuthContext();

  const result = await fetchMutation(
    api.availability.cancel,
    { recordId: params.recordId },
    { token },
  );

  return result;
}
