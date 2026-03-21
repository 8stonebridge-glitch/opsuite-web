import { query } from "./_generated/server";
import { requireActiveOrganizationMembership } from "./authHelpers";

/**
 * Org-level dashboard metrics.
 *
 * Returns aggregate statistics for the active organization's tasks and handoffs.
 */
export const dashboard = query({
  args: {},
  handler: async (ctx) => {
    const { organizationId, membership } = await requireActiveOrganizationMembership(ctx);

    // Only owner_admin and subadmin can view org metrics
    if (membership.role === "employee") {
      throw new Error("Employees cannot view organization metrics");
    }

    const now = new Date();
    const todayISO = now.toISOString().split("T")[0]!;

    // Fetch all tasks for the organization
    const allTasks = await ctx.db
      .query("tasks")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", organizationId))
      .collect();

    const totalTasks = allTasks.length;

    // Open tasks: anything not Verified or Completed
    const openTasks = allTasks.filter(
      (t) => t.status !== "Verified" && t.status !== ("Completed" as string),
    ).length;

    // Overdue: past dueDate and not Verified/Completed
    const overdueCount = allTasks.filter(
      (t) =>
        t.dueDate &&
        t.dueDate < todayISO &&
        t.status !== "Verified" &&
        t.status !== ("Completed" as string),
    ).length;

    // Average completion days: for tasks that have both startedAt and completedAt
    const completedTasks = allTasks.filter((t) => t.startedAt && t.completedAt);
    let avgCompletionDays = 0;
    if (completedTasks.length > 0) {
      const totalDays = completedTasks.reduce((sum, t) => {
        const start = new Date(t.startedAt!);
        const end = new Date(t.completedAt!);
        const diffMs = end.getTime() - start.getTime();
        return sum + diffMs / (1000 * 60 * 60 * 24);
      }, 0);
      avgCompletionDays = Math.round((totalDays / completedTasks.length) * 10) / 10;
    }

    // Approval queue size
    const approvalQueueSize = allTasks.filter(
      (t) => t.status === "Pending Approval",
    ).length;

    // Rework rate
    const reworkedTasks = allTasks.filter((t) => t.reworkCount > 0).length;
    const reworkRate = totalTasks > 0
      ? Math.round((reworkedTasks / totalTasks) * 1000) / 1000
      : 0;

    // Handoff compliance: handoffs completed today / total active employees
    const employeeMemberships = await ctx.db
      .query("memberships")
      .withIndex("by_organization_role", (q) =>
        q.eq("organizationId", organizationId).eq("role", "employee"),
      )
      .collect();

    const activeEmployees = employeeMemberships.filter((m) => m.status === "active");
    const totalEmployees = activeEmployees.length;

    let handoffsDoneToday = 0;
    if (totalEmployees > 0) {
      // Query handoffs for today for each active employee
      for (const emp of activeEmployees) {
        const handoff = await ctx.db
          .query("dailyHandoffs")
          .withIndex("by_organization_membership_date", (q) =>
            q
              .eq("organizationId", organizationId)
              .eq("membershipId", emp._id)
              .eq("date", todayISO),
          )
          .unique();

        if (handoff) handoffsDoneToday++;
      }
    }

    const handoffComplianceRate = totalEmployees > 0
      ? Math.round((handoffsDoneToday / totalEmployees) * 1000) / 1000
      : 1;

    return {
      totalTasks,
      openTasks,
      overdueCount,
      avgCompletionDays,
      approvalQueueSize,
      reworkRate,
      handoffComplianceRate,
    };
  },
});
