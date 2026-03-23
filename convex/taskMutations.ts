import { v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";
import { requireActiveOrganizationMembership } from "./authHelpers";
import {
  getAllowedNextStatuses,
  getVisibleTask,
  insertCreateAudits,
  insertStatusAudits,
  insertTaskAudit,
  validateAccountableLead,
  validateAssignee,
  validateDueDate,
  validateEmployeeAssignment,
  validateSiteAndTeam,
} from "./taskHelpers";
import { createNotification } from "./notifications";

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("critical")),
    siteId: v.optional(v.id("sites")),
    teamId: v.optional(v.id("teams")),
    assignedToMembershipId: v.optional(v.id("memberships")),
    accountableLeadMembershipId: v.id("memberships"),
    dueDate: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId, membership } = await requireActiveOrganizationMembership(ctx);
    const isEmployeeSubmission = membership.role === "employee";

    // Employees can only create tasks assigned to themselves — never to others
    if (isEmployeeSubmission && args.assignedToMembershipId && args.assignedToMembershipId !== membership._id) {
      throw new Error("Employees can only raise tasks for themselves, not assign to others.");
    }
    // Force employee tasks to be self-assigned
    if (isEmployeeSubmission && !args.assignedToMembershipId) {
      args = { ...args, assignedToMembershipId: membership._id };
    }

    await validateSiteAndTeam(ctx, args, organizationId);
    await validateAccountableLead(ctx, args.accountableLeadMembershipId, organizationId, membership);
    validateEmployeeAssignment(args.assignedToMembershipId, membership, isEmployeeSubmission);

    const assignedMembership = args.assignedToMembershipId
      ? await validateAssignee(ctx, args.assignedToMembershipId, organizationId)
      : null;

    validateDueDate(args.dueDate);

    const now = new Date().toISOString();
    const delegatedAt =
      membership.role === "subadmin" && assignedMembership && assignedMembership._id !== membership._id
        ? now : undefined;

    const taskId = await ctx.db.insert("tasks", {
      organizationId, siteId: args.siteId, teamId: args.teamId,
      title: args.title.trim(),
      description: args.description?.trim() || undefined,
      priority: args.priority,
      status: isEmployeeSubmission ? "Pending Approval" : "Open",
      createdByMembershipId: membership._id,
      accountableLeadMembershipId: args.accountableLeadMembershipId,
      assignedToMembershipId: args.assignedToMembershipId,
      delegatedAt, dueDate: args.dueDate || undefined,
      lastActivityAt: now, isReworked: false, reworkCount: 0,
      note: args.note?.trim() || undefined, createdAt: now, updatedAt: now,
    });

    await insertCreateAudits(ctx, {
      organizationId, taskId, membership, assignedMembership,
      isEmployeeSubmission, dueDate: args.dueDate, note: args.note, now,
    });

    // Notify assignee (if different from creator)
    if (args.assignedToMembershipId && args.assignedToMembershipId !== membership._id) {
      const assigneeUser = assignedMembership ? await ctx.db.get(assignedMembership.userId) : null;
      await createNotification(ctx, {
        organizationId, membershipId: args.assignedToMembershipId,
        title: "New task assigned", body: `"${args.title.trim()}" has been assigned to you.`,
        type: "task", taskId, route: "tasks",
      });
    }
    // Notify accountable lead (if different from creator and assignee)
    if (args.accountableLeadMembershipId !== membership._id &&
        args.accountableLeadMembershipId !== args.assignedToMembershipId) {
      await createNotification(ctx, {
        organizationId, membershipId: args.accountableLeadMembershipId,
        title: "Task requires oversight", body: `"${args.title.trim()}" was created and needs your oversight.`,
        type: "task", taskId, route: "tasks",
      });
    }

    // Record activation milestone if this is the user's first task
    const existingTasks = await ctx.db.query("tasks").withIndex("by_organization_id", (q) => q.eq("organizationId", organizationId)).take(2);
    if (existingTasks.length <= 1) {
      const existing = await ctx.db.query("activationMilestones").withIndex("by_membership_id", (q) => q.eq("membershipId", membership._id)).collect();
      if (!existing.some(m => m.milestone === "first_task_created")) {
        await ctx.db.insert("activationMilestones", { membershipId: membership._id, organizationId, milestone: "first_task_created", completedAt: new Date().toISOString() });
      }
    }

    return await ctx.db.get(taskId);
  },
});

export const addNote = mutation({
  args: { taskId: v.id("tasks"), message: v.string() },
  handler: async (ctx, args) => {
    const { organizationId, membership, task } = await getVisibleTask(ctx, args.taskId);
    const note = args.message.trim();
    if (!note) throw new Error("A note is required");

    const now = new Date().toISOString();
    await ctx.db.patch(task._id, { lastActivityAt: now, updatedAt: now });
    await insertTaskAudit(ctx, {
      organizationId, taskId: task._id, actorMembershipId: membership._id,
      type: "Note", message: note, createdAt: now,
    });
    return await ctx.db.get(task._id);
  },
});

export const updateStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    status: v.union(
      v.literal("Open"), v.literal("In Progress"),
      v.literal("Submitted"), v.literal("Pending Approval"), v.literal("Verified"),
    ),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId, membership, task, user } = await getVisibleTask(ctx, args.taskId);
    const isAssignee = task.assignedToMembershipId === membership._id;
    const nextStatuses = getAllowedNextStatuses(task.status, membership.role, isAssignee);
    if (!nextStatuses.includes(args.status)) throw new Error("That status transition is not allowed");

    const now = new Date().toISOString();
    const today = now.split("T")[0] || now;
    const isStart = args.status === "In Progress" && task.status === "Open";
    const isDone = args.status === "Submitted";

    await ctx.db.patch(task._id, {
      status: args.status,
      startedAt: isStart ? today : task.startedAt,
      completedAt: isDone ? today : args.status === "Open" ? undefined : task.completedAt,
      lastActivityAt: now, updatedAt: now,
    });

    await insertStatusAudits(ctx, {
      organizationId, task, membership, user,
      newStatus: args.status, note: args.note, now, today, isStart, isDone,
    });

    // Notify accountable lead when task is submitted for review
    if (isDone && task.accountableLeadMembershipId !== membership._id) {
      await createNotification(ctx, {
        organizationId, membershipId: task.accountableLeadMembershipId,
        title: "Task submitted for review", body: `"${task.title}" was submitted by ${user.name}.`,
        type: "review", taskId: task._id, route: "tasks",
      });
    }

    return await ctx.db.get(task._id);
  },
});

export const markNoChange = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const { organizationId, membership, task, user } = await getVisibleTask(ctx, args.taskId);
    if (task.assignedToMembershipId !== membership._id) throw new Error("Only the current assignee can report no change");
    if (task.status !== "Open" && task.status !== "In Progress") throw new Error("No change can only be reported on active tasks");

    const now = new Date().toISOString();
    await ctx.db.patch(task._id, { lastNoChangeAt: now.split("T")[0] || now, lastActivityAt: now, updatedAt: now });
    await insertTaskAudit(ctx, {
      organizationId, taskId: task._id, actorMembershipId: membership._id,
      type: "No Change", message: `No change reported by ${user.name}.`, createdAt: now,
    });
    return await ctx.db.get(task._id);
  },
});

export const delegate = mutation({
  args: { taskId: v.id("tasks"), assigneeMembershipId: v.id("memberships") },
  handler: async (ctx, args) => {
    const { organizationId, membership, task, user } = await getVisibleTask(ctx, args.taskId);
    if (membership.role === "employee") throw new Error("Employees cannot delegate tasks");
    if (membership.role === "subadmin" && task.accountableLeadMembershipId !== membership._id) throw new Error("Only the accountable subadmin can delegate this task");
    if (task.assignedToMembershipId !== membership._id && membership.role !== "owner_admin") throw new Error("This task has already been delegated");

    const assigneeMembership = await ctx.db.get(args.assigneeMembershipId);
    if (!assigneeMembership || assigneeMembership.organizationId !== organizationId || assigneeMembership.status !== "active" || assigneeMembership.role !== "employee") {
      throw new Error("That employee is not valid for this organization");
    }
    if (!assigneeMembership.teamIds.some((tid) => membership.teamIds.map(String).includes(String(tid)))) {
      throw new Error("You can only delegate to people in your scope");
    }

    const assigneeUser = await ctx.db.get(assigneeMembership.userId);
    const now = new Date().toISOString();
    await ctx.db.patch(task._id, { assignedToMembershipId: assigneeMembership._id, delegatedAt: now, lastActivityAt: now, updatedAt: now });
    await insertTaskAudit(ctx, {
      organizationId, taskId: task._id, actorMembershipId: membership._id,
      type: "Delegated", message: `Delegated to ${assigneeUser?.name || "team member"} by ${user.name}.`, createdAt: now,
    });

    // Notify new assignee
    await createNotification(ctx, {
      organizationId, membershipId: assigneeMembership._id,
      title: "Task delegated to you", body: `"${task.title}" was delegated to you by ${user.name}.`,
      type: "task", taskId: task._id, route: "tasks",
    });

    return await ctx.db.get(task._id);
  },
});

export const approvePending = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const { organizationId, membership, task, user } = await getVisibleTask(ctx, args.taskId);
    if (membership.role === "employee") throw new Error("Employees cannot approve tasks");
    if (task.status !== "Pending Approval") throw new Error("Only pending-approval tasks can be approved");
    if (task.createdByMembershipId === membership._id) throw new Error("You cannot approve your own task");

    const now = new Date().toISOString();
    await ctx.db.patch(task._id, { status: "Open", lastActivityAt: now, updatedAt: now });
    await insertTaskAudit(ctx, {
      organizationId, taskId: task._id, actorMembershipId: membership._id,
      type: "Approval", message: `Approved by ${user.name}. Work may proceed.`, createdAt: now,
    });

    // Notify the creator their task was approved
    if (task.createdByMembershipId !== membership._id) {
      await createNotification(ctx, {
        organizationId, membershipId: task.createdByMembershipId,
        title: "Task approved", body: `"${task.title}" was approved by ${user.name}.`,
        type: "task", taskId: task._id, route: "tasks",
      });
    }

    return await ctx.db.get(task._id);
  },
});

export const verify = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const { organizationId, membership, task, user } = await getVisibleTask(ctx, args.taskId);
    if (membership.role === "employee") throw new Error("Employees cannot verify tasks");
    if (task.status !== "Submitted") throw new Error("Only completed tasks can be verified");
    if (task.assignedToMembershipId === membership._id) throw new Error("You cannot verify your own task");

    const now = new Date().toISOString();
    const completedLate = task.dueDate && task.completedAt && task.completedAt > task.dueDate;
    await ctx.db.patch(task._id, { status: "Verified", verifiedAt: now.split("T")[0] || now, lastActivityAt: now, updatedAt: now });
    await insertTaskAudit(ctx, {
      organizationId, taskId: task._id, actorMembershipId: membership._id,
      type: "Verified", message: `✓ Verified & closed by ${user.name}.${completedLate ? " ⚠ Completed past due date." : ""}`, createdAt: now,
    });

    // Notify assignee their task was verified
    if (task.assignedToMembershipId && task.assignedToMembershipId !== membership._id) {
      await createNotification(ctx, {
        organizationId, membershipId: task.assignedToMembershipId,
        title: "Task verified", body: `"${task.title}" was verified by ${user.name}.`,
        type: "review", taskId: task._id, route: "tasks",
      });
    }

    return await ctx.db.get(task._id);
  },
});

export const requestRework = mutation({
  args: { taskId: v.id("tasks"), reason: v.string() },
  handler: async (ctx, args) => {
    const { organizationId, membership, task, user } = await getVisibleTask(ctx, args.taskId);
    if (membership.role === "employee") throw new Error("Employees cannot request rework");
    if (task.status !== "Submitted") throw new Error("Only completed tasks can be sent to rework");

    const settings = await ctx.db.query("orgSettings").withIndex("by_organization_id", (q) => q.eq("organizationId", organizationId)).unique();
    const reason = args.reason.trim();
    if (!reason) throw new Error("A rework reason is required");

    const cycle = task.reworkCount + 1;
    const escalated = cycle >= (settings?.reworkAlertCycles ?? 3);
    const now = new Date().toISOString();

    await ctx.db.patch(task._id, {
      status: "In Progress", isReworked: true, reworkCount: cycle,
      priority: escalated ? "critical" : task.priority,
      completedAt: undefined, verifiedAt: undefined, lastActivityAt: now, updatedAt: now,
    });
    await insertTaskAudit(ctx, { organizationId, taskId: task._id, actorMembershipId: membership._id, type: "Rework", message: `Rework requested by ${user.name}: ${reason}. Cycle ${cycle}.`, createdAt: now });
    if (escalated) {
      await insertTaskAudit(ctx, { organizationId, taskId: task._id, type: "Escalation", message: `⚠ Escalated to CRITICAL after ${cycle} rework cycles.`, createdAt: now });
    }

    // Notify assignee about rework
    if (task.assignedToMembershipId && task.assignedToMembershipId !== membership._id) {
      await createNotification(ctx, {
        organizationId, membershipId: task.assignedToMembershipId,
        title: "Rework requested", body: `"${task.title}" needs rework: ${reason}`,
        type: "task", taskId: task._id, route: "tasks",
      });
    }

    return await ctx.db.get(task._id);
  },
});

export const bulkApprove = mutation({
  args: { taskIds: v.array(v.id("tasks")) },
  handler: async (ctx, args) => {
    if (args.taskIds.length > 25) throw new Error("Cannot bulk approve more than 25 tasks at once");
    if (args.taskIds.length === 0) return { approved: 0 };

    const { organizationId, membership } = await requireActiveOrganizationMembership(ctx);
    if (membership.role === "employee") throw new Error("Employees cannot approve tasks");

    const user = await ctx.db.get(membership.userId);
    if (!user) throw new Error("User not found");
    const now = new Date().toISOString();
    let approved = 0;

    for (const taskId of args.taskIds) {
      const task = await ctx.db.get(taskId);
      if (!task || task.organizationId !== organizationId) continue;
      if (task.status !== "Pending Approval") continue;
      if (task.createdByMembershipId === membership._id) continue; // skip self-created tasks

      await ctx.db.patch(task._id, { status: "Open", lastActivityAt: now, updatedAt: now });
      await insertTaskAudit(ctx, {
        organizationId, taskId: task._id, actorMembershipId: membership._id,
        type: "Approval", message: `Approved by ${user.name}. Work may proceed.`, createdAt: now,
      });

      if (task.createdByMembershipId !== membership._id) {
        await createNotification(ctx, {
          organizationId, membershipId: task.createdByMembershipId,
          title: "Task approved", body: `"${task.title}" was approved by ${user.name}.`,
          type: "task", taskId: task._id, route: "tasks",
        });
      }
      approved++;
    }

    return { approved };
  },
});

// One-time migration — internal only, not callable from client browsers
export const migrateCompletedToSubmitted = internalMutation({
  args: {},
  handler: async (ctx) => {
    const { organizationId } = await requireActiveOrganizationMembership(ctx);
    const tasks = await ctx.db.query("tasks").withIndex("by_organization_id", (q) => q.eq("organizationId", organizationId)).collect();
    let migrated = 0;
    const now = new Date().toISOString();
    for (const task of tasks) {
      if ((task.status as string) === "Completed") {
        await ctx.db.patch(task._id, { status: "Submitted", updatedAt: now });
        migrated++;
      }
    }
    return { migrated };
  },
});
