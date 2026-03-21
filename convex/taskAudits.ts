import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireActiveOrganizationMembership } from "./authHelpers";

// ── Queries ─────────────────────────────────────────────────────────

/**
 * List audit entries for the active organization, ordered by createdAt desc.
 * Limited to 200 entries.
 */
export const listForOrganization = query({
  args: {},
  handler: async (ctx) => {
    const { organizationId, membership } = await requireActiveOrganizationMembership(ctx);

    // Only owner_admin and subadmin can view org-wide audit logs
    if (membership.role === "employee") {
      throw new Error("Employees cannot view organization audit logs");
    }

    const audits = await ctx.db
      .query("taskAudits")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", organizationId))
      .order("desc")
      .take(200);

    return audits;
  },
});
