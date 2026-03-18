import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mapRole } from "./taskHelpers";

export async function hydrateTasks(
  ctx: QueryCtx | MutationCtx,
  tasks: Doc<"tasks">[],
) {
  const siteIds = [...new Set(tasks.map((task) => task.siteId).filter(Boolean))] as Id<"sites">[];
  const teamIds = [...new Set(tasks.map((task) => task.teamId).filter(Boolean))] as Id<"teams">[];
  const membershipIds = [
    ...new Set(
      tasks.flatMap((task) =>
        [
          task.createdByMembershipId,
          task.accountableLeadMembershipId,
          task.assignedToMembershipId,
        ].filter(Boolean),
      ),
    ),
  ] as Id<"memberships">[];

  const [sites, teams, memberships] = await Promise.all([
    Promise.all(siteIds.map((siteId) => ctx.db.get(siteId))),
    Promise.all(teamIds.map((teamId) => ctx.db.get(teamId))),
    Promise.all(membershipIds.map((membershipId) => ctx.db.get(membershipId))),
  ]);

  const siteMap = new Map(
    sites.filter(Boolean).map((site) => [String(site!._id), site!]),
  );
  const teamMap = new Map(
    teams.filter(Boolean).map((team) => [String(team!._id), team!]),
  );
  const membershipMap = new Map(
    memberships.filter(Boolean).map((membership) => [String(membership!._id), membership!]),
  );

  const userIds = [
    ...new Set(
      memberships
        .filter(Boolean)
        .map((membership) => membership!.userId),
    ),
  ] as Id<"users">[];

  const users = await Promise.all(userIds.map((userId) => ctx.db.get(userId)));
  const userMap = new Map(
    users.filter(Boolean).map((user) => [String(user!._id), user!]),
  );

  return tasks.map((task) => {
    const site = task.siteId ? siteMap.get(String(task.siteId)) : null;
    const team = task.teamId ? teamMap.get(String(task.teamId)) : null;
    const creatorMembership = membershipMap.get(String(task.createdByMembershipId));
    const creatorUser = creatorMembership ? userMap.get(String(creatorMembership.userId)) : null;
    const accountableLeadMembership = membershipMap.get(String(task.accountableLeadMembershipId));
    const accountableLeadUser = accountableLeadMembership
      ? userMap.get(String(accountableLeadMembership.userId))
      : null;
    const assignedMembership = task.assignedToMembershipId
      ? membershipMap.get(String(task.assignedToMembershipId))
      : null;
    const assigneeUser = assignedMembership ? userMap.get(String(assignedMembership.userId)) : null;

    return {
      id: String(task._id),
      title: task.title,
      description: task.description,
      site: site?.name || "",
      siteId: task.siteId ? String(task.siteId) : "",
      category: task.description,
      priority: task.priority,
      due: task.dueDate || null,
      assignee: assigneeUser?.name || accountableLeadUser?.name || creatorUser?.name || "Unassigned",
      assigneeId: assigneeUser ? String(assigneeUser._id) : "",
      teamId: task.teamId ? String(task.teamId) : "",
      status: task.status,
      assignedBy: creatorUser?.name || "Manager",
      assignedByRole: creatorMembership ? mapRole(creatorMembership.role) : "admin",
      note: task.note,
      approved: task.status !== "Pending Approval",
      createdAt: task.createdAt.split("T")[0] || task.createdAt,
      startedAt: task.startedAt?.split("T")[0],
      completedAt: task.completedAt?.split("T")[0],
      verifiedBy: undefined,
      reworked: task.isReworked,
      reworkCount: task.reworkCount,
      lastActivityAt: task.lastActivityAt,
      accountableLeadId:
        accountableLeadMembership?.role === "owner_admin"
          ? "admin"
          : accountableLeadUser
            ? String(accountableLeadUser._id)
            : undefined,
      accountableLeadName: accountableLeadUser?.name,
      delegatedAt: task.delegatedAt,
      lastNoChangeAt: task.lastNoChangeAt,
      stalledDays: 0,
    };
  });
}

export async function hydrateAudits(
  ctx: QueryCtx | MutationCtx,
  audits: Doc<"taskAudits">[],
) {
  const actorMembershipIds = [
    ...new Set(audits.map((audit) => audit.actorMembershipId).filter(Boolean)),
  ] as Id<"memberships">[];

  const actorMemberships = await Promise.all(
    actorMembershipIds.map((membershipId) => ctx.db.get(membershipId)),
  );
  const actorMembershipMap = new Map(
    actorMemberships
      .filter(Boolean)
      .map((actorMembership) => [String(actorMembership!._id), actorMembership!]),
  );
  const actorUsers = await Promise.all(
    actorMemberships
      .filter(Boolean)
      .map((actorMembership) => ctx.db.get(actorMembership!.userId)),
  );
  const actorUserMap = new Map(
    actorUsers.filter(Boolean).map((actorUser) => [String(actorUser!._id), actorUser!]),
  );

  return audits.map((audit) => {
    const actorMembership = audit.actorMembershipId
      ? actorMembershipMap.get(String(audit.actorMembershipId))
      : null;
    const actorUser = actorMembership ? actorUserMap.get(String(actorMembership.userId)) : null;

    return {
      id: String(audit._id),
      taskId: String(audit.taskId),
      role: actorMembership ? mapRole(actorMembership.role) : "System",
      message: audit.message,
      createdAt: audit.createdAt,
      dateTag: audit.createdAt.split("T")[0] || audit.createdAt,
      updateType: audit.type,
      actorName: actorUser?.name,
    };
  });
}
