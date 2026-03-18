import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { requireActiveOrganizationMembership } from "./authHelpers";

export function mapRole(
  role: "owner_admin" | "subadmin" | "employee",
): "admin" | "subadmin" | "employee" {
  return role === "owner_admin" ? "admin" : role;
}

export function canViewTask(task: Doc<"tasks">, membership: Doc<"memberships">) {
  if (membership.role === "owner_admin") return true;
  if (membership.role === "subadmin") {
    return (
      task.accountableLeadMembershipId === membership._id ||
      task.assignedToMembershipId === membership._id
    );
  }
  return task.assignedToMembershipId === membership._id;
}

export function getAllowedNextStatuses(
  current: Doc<"tasks">["status"],
  role: Doc<"memberships">["role"],
  isAssignee: boolean,
): Doc<"tasks">["status"][] {
  if (isAssignee) {
    if (current === "Open") return ["In Progress"];
    if (current === "In Progress") return ["Submitted"];
  }

  if (role === "subadmin" || role === "owner_admin") {
    if (current === "Open") return ["In Progress"];
    if (current === "In Progress") return ["Submitted"];
    if (current === "Pending Approval") return ["Open"];
    if (current === "Verified") return ["Open"];
  }

  return [];
}

export async function getVisibleTask(
  ctx: QueryCtx | MutationCtx,
  taskId: Id<"tasks">,
) {
  const access = await requireActiveOrganizationMembership(ctx);
  const task = await ctx.db.get(taskId);

  if (!task || task.organizationId !== access.organizationId || !canViewTask(task, access.membership)) {
    throw new Error("Task not found in the active organization");
  }

  return { ...access, task };
}

export async function insertTaskAudit(
  ctx: MutationCtx,
  args: {
    organizationId: Id<"organizations">;
    taskId: Id<"tasks">;
    actorMembershipId?: Id<"memberships">;
    type: string;
    message: string;
    createdAt: string;
  },
) {
  await ctx.db.insert("taskAudits", {
    organizationId: args.organizationId,
    taskId: args.taskId,
    actorMembershipId: args.actorMembershipId,
    type: args.type,
    message: args.message,
    createdAt: args.createdAt,
  });
}

// ── Validation helpers (used by taskMutations) ───────────────

export async function validateSiteAndTeam(
  ctx: { db: { get: (id: Id<"sites"> | Id<"teams">) => Promise<Doc<"sites"> | Doc<"teams"> | null> } },
  args: { siteId?: Id<"sites">; teamId?: Id<"teams"> },
  organizationId: Id<"organizations">,
) {
  if (args.siteId) {
    const site = await ctx.db.get(args.siteId);
    if (!site || (site as Doc<"sites">).organizationId !== organizationId) {
      throw new Error("That site does not belong to the active organization");
    }
  }
  if (args.teamId) {
    const team = await ctx.db.get(args.teamId);
    if (!team || (team as Doc<"teams">).organizationId !== organizationId) {
      throw new Error("That team does not belong to the active organization");
    }
  }
}

export async function validateAccountableLead(
  ctx: { db: { get: (id: Id<"memberships">) => Promise<Doc<"memberships"> | null> } },
  leadId: Id<"memberships">,
  organizationId: Id<"organizations">,
  membership: Doc<"memberships">,
) {
  const lead = await ctx.db.get(leadId);
  if (!lead || lead.organizationId !== organizationId || lead.status !== "active") {
    throw new Error("That accountable lead is not valid for the active organization");
  }
  if (membership.role === "subadmin" && lead._id !== membership._id) {
    throw new Error("Subadmins can only create tasks under their own lead scope");
  }
}

export function validateEmployeeAssignment(
  assignedToMembershipId: Id<"memberships"> | undefined,
  membership: Doc<"memberships">,
  isEmployeeSubmission: boolean,
) {
  if (isEmployeeSubmission && assignedToMembershipId && assignedToMembershipId !== membership._id) {
    throw new Error("Employees cannot assign tasks to other people");
  }
}

export async function validateAssignee(
  ctx: { db: { get: (id: Id<"memberships">) => Promise<Doc<"memberships"> | null> } },
  assigneeId: Id<"memberships">,
  organizationId: Id<"organizations">,
) {
  const assignee = await ctx.db.get(assigneeId);
  if (!assignee || assignee.organizationId !== organizationId || assignee.status !== "active") {
    throw new Error("That assignee is not valid for the active organization");
  }
  return assignee;
}

export function validateDueDate(dueDate?: string) {
  if (!dueDate) throw new Error("Due date is required");
  const today = new Date().toISOString().split("T")[0];
  if (dueDate < today!) throw new Error("Due date cannot be in the past");
}

export async function insertCreateAudits(
  ctx: MutationCtx,
  opts: {
    organizationId: Id<"organizations">; taskId: Id<"tasks">;
    membership: Doc<"memberships">; assignedMembership: Doc<"memberships"> | null;
    isEmployeeSubmission: boolean; dueDate?: string; note?: string; now: string;
  },
) {
  const actorUser = await ctx.db.get(opts.membership.userId);
  const assigneeUser = opts.assignedMembership ? await ctx.db.get(opts.assignedMembership.userId) : null;

  let message: string;
  if (opts.isEmployeeSubmission) {
    message = `Task submitted by ${actorUser?.name || "Employee"}. Awaiting approval.${opts.dueDate ? ` Due date: ${opts.dueDate}.` : ""}`;
  } else if (assigneeUser) {
    message = `Task assigned to ${assigneeUser.name} by ${actorUser?.name || "Manager"}${opts.dueDate ? `. Due date: ${opts.dueDate}.` : "."}`;
  } else {
    message = `Task created by ${actorUser?.name || "Manager"}.`;
  }

  await ctx.db.insert("taskAudits", {
    organizationId: opts.organizationId, taskId: opts.taskId,
    actorMembershipId: opts.membership._id,
    type: opts.isEmployeeSubmission ? "Submission" : "Assignment",
    message, createdAt: opts.now,
  });

  if (opts.note?.trim()) {
    await ctx.db.insert("taskAudits", {
      organizationId: opts.organizationId, taskId: opts.taskId,
      actorMembershipId: opts.membership._id,
      type: "Instruction", message: opts.note.trim(), createdAt: opts.now,
    });
  }
}

export async function insertStatusAudits(
  ctx: MutationCtx,
  opts: {
    organizationId: Id<"organizations">; task: Doc<"tasks">;
    membership: Doc<"memberships">; user: Doc<"users">;
    newStatus: string; note?: string; now: string; today: string;
    isStart: boolean; isDone: boolean;
  },
) {
  const isApproval = opts.newStatus === "Open" && opts.task.status === "Pending Approval";
  const isReopen = opts.newStatus === "Open" && opts.task.status === "Verified";

  if (opts.note?.trim()) {
    await insertTaskAudit(ctx, {
      organizationId: opts.organizationId, taskId: opts.task._id,
      actorMembershipId: opts.membership._id,
      type: "Progress Update", message: opts.note.trim(), createdAt: opts.now,
    });
  }

  if (isApproval) {
    await insertTaskAudit(ctx, {
      organizationId: opts.organizationId, taskId: opts.task._id,
      actorMembershipId: opts.membership._id,
      type: "Approval", message: `Approved by ${opts.user.name}. Work may proceed.`, createdAt: opts.now,
    });
  }

  if (isReopen) {
    await insertTaskAudit(ctx, {
      organizationId: opts.organizationId, taskId: opts.task._id,
      actorMembershipId: opts.membership._id,
      type: "Reopened",
      message: `Reopened by ${opts.user.name} (${mapRole(opts.membership.role)}).`,
      createdAt: opts.now,
    });
  }

  if (opts.isStart) {
    await insertTaskAudit(ctx, {
      organizationId: opts.organizationId, taskId: opts.task._id,
      actorMembershipId: opts.membership._id,
      type: "Status",
      message: `▶ Task started on ${opts.today} by ${opts.user.name} (${mapRole(opts.membership.role)}). Status: Open → Active.`,
      createdAt: opts.now,
    });
  }

  if (opts.isDone) {
    await insertTaskAudit(ctx, {
      organizationId: opts.organizationId, taskId: opts.task._id,
      actorMembershipId: opts.membership._id,
      type: "Status",
      message: `✓ Task completed on ${opts.today} by ${opts.user.name} (${mapRole(opts.membership.role)}). Awaiting verification.`,
      createdAt: opts.now,
    });
  }
}
