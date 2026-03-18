/**
 * Task module — re-exports queries and mutations from split files.
 *
 * Convex resolves public functions from this barrel file so that
 * existing client imports (`api.tasks.create`, etc.) continue to work.
 */
import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireActiveOrganizationMembership } from "./authHelpers";
import { canViewTask, getAllowedNextStatuses } from "./taskHelpers";
import { hydrateTasks, hydrateAudits } from "./taskHydration";

// ── Re-export all mutations ──────────────────────────────────
export {
  create,
  addNote,
  updateStatus,
  markNoChange,
  delegate,
  approvePending,
  verify,
  requestRework,
  migrateCompletedToSubmitted,
} from "./taskMutations";

// ── Queries ──────────────────────────────────────────────────

export const listForCurrentScope = query({
  args: {},
  handler: async (ctx) => {
    const { organizationId, membership } = await requireActiveOrganizationMembership(ctx);

    let scopedTasks: Doc<"tasks">[] = [];

    if (membership.role === "owner_admin") {
      scopedTasks = await ctx.db
        .query("tasks")
        .withIndex("by_organization_id", (q) => q.eq("organizationId", organizationId))
        .collect();
    } else if (membership.role === "subadmin") {
      const allTasks = await ctx.db
        .query("tasks")
        .withIndex("by_organization_id", (q) => q.eq("organizationId", organizationId))
        .collect();
      scopedTasks = allTasks.filter(
        (t) => t.accountableLeadMembershipId === membership._id || t.assignedToMembershipId === membership._id
      );
    } else {
      scopedTasks = await ctx.db
        .query("tasks")
        .withIndex("by_organization_assignee", (q) =>
          q.eq("organizationId", organizationId).eq("assignedToMembershipId", membership._id)
        )
        .collect();
    }

    const hydratedScopedTasks = await hydrateTasks(ctx, scopedTasks);
    const hydratedAssignedTasks = await hydrateTasks(
      ctx,
      scopedTasks.filter((task) => task.createdByMembershipId === membership._id),
    );

    return {
      scopedTasks: hydratedScopedTasks,
      myAssignedTasks: hydratedAssignedTasks,
      auditEntries: [],
    };
  },
});

export const getDetail = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const { organizationId, membership } = await requireActiveOrganizationMembership(ctx);
    const task = await ctx.db.get(args.taskId);

    if (!task || task.organizationId !== organizationId || !canViewTask(task, membership)) {
      return null;
    }

    const [hydratedTask] = await hydrateTasks(ctx, [task]);
    const audits = await ctx.db
      .query("taskAudits")
      .withIndex("by_task_created_at", (q) => q.eq("taskId", args.taskId))
      .collect();

    let teamMembers: Array<{ membershipId: string; userId: string; name: string }> = [];
    if (
      membership.role === "subadmin" &&
      task.accountableLeadMembershipId === membership._id &&
      task.assignedToMembershipId === membership._id
    ) {
      teamMembers = await getEligibleTeamMembers(ctx, organizationId, membership);
    }

    const isAssignee = task.assignedToMembershipId === membership._id;
    const isManagerRole = membership.role === "owner_admin" || membership.role === "subadmin";
    const allowedNextStatuses = getAllowedNextStatuses(task.status, membership.role, isAssignee);

    return {
      task: hydratedTask,
      isAssignee,
      canApprove: isManagerRole && task.status === "Pending Approval",
      canVerify: isManagerRole && task.status === "Submitted",
      canRequestRework: isManagerRole && task.status === "Submitted",
      canUpdateStatus: allowedNextStatuses.length > 0,
      allowedNextStatuses,
      canDelegate:
        membership.role === "subadmin" &&
        task.accountableLeadMembershipId === membership._id &&
        task.assignedToMembershipId === membership._id &&
        !task.delegatedAt,
      teamMembers,
      audit: await hydrateAudits(ctx, audits),
    };
  },
});

// ── Internal helpers ─────────────────────────────────────────

async function getEligibleTeamMembers(
  ctx: Parameters<typeof requireActiveOrganizationMembership>[0],
  organizationId: Doc<"organizations">["_id"],
  membership: Doc<"memberships">,
) {
  const scopedMemberships = await ctx.db
    .query("memberships")
    .withIndex("by_organization_id", (q) => q.eq("organizationId", organizationId))
    .collect();

  const eligible = scopedMemberships.filter(
    (entry) =>
      entry.status === "active" &&
      entry.role === "employee" &&
      entry.teamIds.some((teamId) => membership.teamIds.map(String).includes(String(teamId))),
  );

  const users = await Promise.all(eligible.map((entry) => ctx.db.get(entry.userId)));

  return eligible
    .map((entry, i) => {
      const u = users[i];
      if (!u) return null;
      return { membershipId: String(entry._id), userId: String(u._id), name: u.name };
    })
    .filter(Boolean)
    .sort((a, b) => a!.name.localeCompare(b!.name)) as Array<{
      membershipId: string; userId: string; name: string;
    }>;
}
