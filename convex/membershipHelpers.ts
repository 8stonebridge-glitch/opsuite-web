import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export async function validateAssignments(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  siteIds: Id<"sites">[],
  teamIds: Id<"teams">[],
) {
  if (siteIds.length === 0) {
    throw new Error("Every person must be linked to a site");
  }

  for (const siteId of siteIds) {
    const site = await ctx.db.get(siteId);
    if (!site || site.organizationId !== organizationId) {
      throw new Error("One of the selected sites does not belong to the active organization");
    }
  }

  for (const teamId of teamIds) {
    const team = await ctx.db.get(teamId);
    if (!team || team.organizationId !== organizationId) {
      throw new Error("One of the selected teams does not belong to the active organization");
    }
    if (team.siteId && !siteIds.some((siteId) => String(siteId) === String(team.siteId))) {
      throw new Error("Selected team must belong to the selected site");
    }
  }
}

export async function syncSubadminTeamAssignments(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  membership: Pick<Doc<"memberships">, "_id" | "role">,
  nextTeamIds: Id<"teams">[],
) {
  const organizationTeams = await ctx.db
    .query("teams")
    .withIndex("by_organization_id", (q) => q.eq("organizationId", organizationId))
    .collect();

  const nextTeamSet = new Set(nextTeamIds.map((teamId) => String(teamId)));
  const now = new Date().toISOString();

  await clearStaleSubadminLinks(ctx, organizationTeams, membership, nextTeamSet, now);

  if (membership.role !== "subadmin") {
    return;
  }

  await assignSubadminToTeams(ctx, organizationTeams, membership, nextTeamSet, now);
}

async function clearStaleSubadminLinks(
  ctx: MutationCtx,
  teams: Doc<"teams">[],
  membership: Pick<Doc<"memberships">, "_id" | "role">,
  nextTeamSet: Set<string>,
  now: string,
) {
  for (const team of teams) {
    const ownedByMember =
      team.subadminMembershipId && String(team.subadminMembershipId) === String(membership._id);

    if (ownedByMember && (membership.role !== "subadmin" || !nextTeamSet.has(String(team._id)))) {
      await ctx.db.patch(team._id, {
        subadminMembershipId: undefined,
        updatedAt: now,
      });
    }
  }
}

async function assignSubadminToTeams(
  ctx: MutationCtx,
  teams: Doc<"teams">[],
  membership: Pick<Doc<"memberships">, "_id" | "role">,
  nextTeamSet: Set<string>,
  now: string,
) {
  for (const teamId of nextTeamSet) {
    const team = teams.find((entry) => String(entry._id) === teamId);
    if (!team) continue;

    if (team.subadminMembershipId && String(team.subadminMembershipId) !== String(membership._id)) {
      throw new Error("One of the selected teams is already linked to another subadmin");
    }

    if (String(team.subadminMembershipId) !== String(membership._id)) {
      await ctx.db.patch(team._id, {
        subadminMembershipId: membership._id,
        updatedAt: now,
      });
    }
  }
}

/**
 * Upsert a user record by email. Returns the (possibly created) user document.
 */
export async function upsertUserByEmail(
  ctx: MutationCtx,
  opts: {
    email: string;
    name: string;
    phone: string;
    authUserId?: string;
  },
) {
  const now = new Date().toISOString();

  let user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", opts.email))
    .unique();

  if (user) {
    await ctx.db.patch(user._id, {
      ...(opts.authUserId ? { authUserId: opts.authUserId } : {}),
      name: opts.name,
      phone: opts.phone,
      updatedAt: now,
    });
    return (await ctx.db.get(user._id))!;
  }

  const userId = await ctx.db.insert("users", {
    authUserId: opts.authUserId || `pending:${opts.email}`,
    email: opts.email,
    name: opts.name,
    phone: opts.phone,
    createdAt: now,
    updatedAt: now,
  });
  return (await ctx.db.get(userId))!;
}
