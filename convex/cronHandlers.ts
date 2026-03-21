/**
 * Internal mutation handlers for cron jobs.
 *
 * These are invoked by the cron scheduler defined in convex/crons.ts.
 * They run without user auth context, so they query across all orgs.
 */
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import { createNotification } from "./notifications";

// ── Overdue task escalation ─────────────────────────────────────────
// Runs every hour. Finds tasks past their dueDate that are still active
// and creates a notification for the accountable lead.

export const escalateOverdueTasks = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const todayISO = now.toISOString().split("T")[0]!;

    // Collect all organizations, then scan their tasks
    const organizations = await ctx.db.query("organizations").collect();
    let escalated = 0;

    for (const org of organizations) {
      const tasks = await ctx.db
        .query("tasks")
        .withIndex("by_organization_id", (q) => q.eq("organizationId", org._id))
        .collect();

      const overdue = tasks.filter(
        (task) =>
          task.dueDate &&
          task.dueDate < todayISO &&
          task.status !== "Verified" &&
          task.status !== "Completed" as string,
      );

      for (const task of overdue) {
        await createNotification(ctx, {
          organizationId: org._id,
          membershipId: task.accountableLeadMembershipId,
          title: "Overdue task",
          body: `"${task.title}" is past its due date (${task.dueDate}).`,
          type: "task",
          taskId: task._id,
          route: "tasks",
        });
        escalated++;
      }
    }

    return { escalated };
  },
});

// ── Stale task detection ────────────────────────────────────────────
// Runs daily. Finds tasks with no activity for X workdays (from orgSettings).

function countWorkdaysBetween(startISO: string, endISO: string): number {
  const start = new Date(startISO);
  const end = new Date(endISO);
  let count = 0;
  const current = new Date(start);
  while (current < end) {
    current.setDate(current.getDate() + 1);
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

export const detectStaleTasks = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const todayISO = now.toISOString().split("T")[0]!;

    const organizations = await ctx.db.query("organizations").collect();
    let flagged = 0;

    for (const org of organizations) {
      const settings = await ctx.db
        .query("orgSettings")
        .withIndex("by_organization_id", (q) => q.eq("organizationId", org._id))
        .unique();

      const threshold = settings?.noChangeAlertWorkdays ?? 3;

      const tasks = await ctx.db
        .query("tasks")
        .withIndex("by_organization_id", (q) => q.eq("organizationId", org._id))
        .collect();

      const activeTasks = tasks.filter(
        (task) =>
          task.status === "Open" ||
          task.status === "In Progress" ||
          task.status === "Pending Approval",
      );

      for (const task of activeTasks) {
        const workdays = countWorkdaysBetween(task.lastActivityAt.split("T")[0]!, todayISO);
        if (workdays >= threshold) {
          await createNotification(ctx, {
            organizationId: org._id,
            membershipId: task.accountableLeadMembershipId,
            title: "Stale task detected",
            body: `"${task.title}" has had no activity for ${workdays} workdays.`,
            type: "task",
            taskId: task._id,
            route: "tasks",
          });
          flagged++;
        }
      }
    }

    return { flagged };
  },
});

// ── Daily handoff reminder ──────────────────────────────────────────
// Runs daily at 8am UTC. Reminds employees who haven't done their handoff.

export const sendHandoffReminders = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const todayISO = now.toISOString().split("T")[0]!;

    const organizations = await ctx.db.query("organizations").collect();
    let reminded = 0;

    for (const org of organizations) {
      // Get all active employee memberships
      const memberships = await ctx.db
        .query("memberships")
        .withIndex("by_organization_role", (q) =>
          q.eq("organizationId", org._id).eq("role", "employee"),
        )
        .collect();

      const activeEmployees = memberships.filter((m) => m.status === "active");

      for (const employee of activeEmployees) {
        // Check if they already completed handoff today
        const handoff = await ctx.db
          .query("dailyHandoffs")
          .withIndex("by_organization_membership_date", (q) =>
            q
              .eq("organizationId", org._id)
              .eq("membershipId", employee._id)
              .eq("date", todayISO),
          )
          .unique();

        if (!handoff) {
          await createNotification(ctx, {
            organizationId: org._id,
            membershipId: employee._id,
            title: "Daily handoff reminder",
            body: "You haven't completed your daily handoff yet. Please review your tasks.",
            type: "handoff",
            route: "handoffs",
          });
          reminded++;
        }
      }
    }

    return { reminded };
  },
});
