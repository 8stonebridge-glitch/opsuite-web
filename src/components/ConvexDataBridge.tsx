'use client';

import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useAction, useConvexAuth } from 'convex/react';
import { api } from '@/lib/convexApi';
import { useApp } from '@/store/AppContext';
import { INDUSTRIES } from '@/constants/industries';
import type { Team, Employee, Role, Site } from '@/types';

// ── Local types for Convex response shapes ────────────────────────────
interface ConvexSiteDoc {
  _id: string;
  name: string;
}

interface ConvexMembershipEntry {
  membership: {
    _id: string;
    role: string;
    teamIds?: string[];
    siteIds?: string[];
  };
  user: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
  };
}

interface ConvexTeamDoc {
  _id: string;
  name: string;
  color?: string;
  siteId?: string;
  subadminMembershipId?: string;
}

/**
 * ConvexDataBridge subscribes to real-time Convex queries and
 * feeds the data into AppContext so all existing selectors and
 * components keep working without changes.
 *
 * It also calls syncFromAuth on mount to ensure the user record
 * exists in Convex. If the mutation fails (e.g. JWT missing email
 * claim), it falls back to syncFromAuthAction which fetches the
 * email from the Clerk API server-side.
 */
export function ConvexDataBridge() {
  const { dispatch } = useApp();
  const { isAuthenticated, isLoading: isConvexLoading } = useConvexAuth();
  const syncFromAuth = useMutation(api.users.syncFromAuth);
  const syncFromAuthAction = useAction(api.users.syncFromAuthAction);
  const hasSynced = useRef(false);

  // ── Reset sync flag on sign-out so re-login works cleanly ──
  useEffect(() => {
    if (!isAuthenticated) {
      hasSynced.current = false;
    }
  }, [isAuthenticated]);

  // ── 1. User viewer (check if auth is active) ──
  // Only query when authenticated to avoid "Unauthenticated" errors
  const viewer = useQuery(api.users.viewer, isAuthenticated ? {} : 'skip');

  // ── 2. Sync user on first auth ──
  // Try mutation first; fall back to action if JWT lacks email claim
  useEffect(() => {
    if (viewer?.identity && !hasSynced.current) {
      hasSynced.current = true;
      syncFromAuth({}).catch((_err: any) => {
        syncFromAuthAction({}).catch(() => {
          // both sync paths failed — user will see Unauthenticated errors
        });
      });
    }
  }, [viewer?.identity, syncFromAuth, syncFromAuthAction]);

  // ── 3. Active organization ──
  const activeOrg = useQuery(api.organizations.active, isAuthenticated && viewer?.user ? {} : 'skip');

  // ── 4. Tasks (only query when we have an active org) ──
  const hasActiveOrg = !!activeOrg?.organization;
  const tasksData = useQuery(api.tasks.listForCurrentScope, hasActiveOrg ? {} : 'skip');

  // ── 5. Memberships ──
  const membershipsData = useQuery(api.memberships.listForActiveOrganization, hasActiveOrg ? {} : 'skip');

  // ── 6. Sites ──
  const sitesData = useQuery(api.sites.listForActiveOrganization, hasActiveOrg ? {} : 'skip');

  // ── 7. Teams ──
  const teamsData = useQuery(api.teams.listForActiveOrganization, hasActiveOrg ? {} : 'skip');

  // ── 8. Availability ──
  const availabilityData = useQuery(api.availability.listForCurrentScope, hasActiveOrg ? {} : 'skip');

  // ── 9. Handoffs + Check-ins ──
  const handoffsData = useQuery(api.handoffs.listForCurrentScope, hasActiveOrg ? {} : 'skip');

  // ── Sync org data into AppContext ──
  useEffect(() => {
    if (!activeOrg) return;

    const org = activeOrg.organization;
    const membership = activeOrg.membership;
    const settings = activeOrg.settings;

    // Map Convex industry ID to our Industry type
    const industry = org.industryId
      ? INDUSTRIES.find((i) => i.id === org.industryId) ?? null
      : null;

    dispatch({ type: 'SET_ORG_NAME', name: org.name });
    dispatch({ type: 'SET_INDUSTRY', industry });

    // Set the admin name from the viewer
    if (viewer?.user?.name) {
      dispatch({ type: 'SET_ADMIN_NAME', name: viewer.user.name });
    }

    // Set org mode
    dispatch({ type: 'SET_ORG_MODE', mode: (org.mode as 'managed' | 'direct') || 'managed' });

    // Set org settings
    if (settings) {
      dispatch({
        type: 'SET_ORG_SETTINGS',
        settings: {
          noChangeAlertWorkdays: settings.noChangeAlertWorkdays,
          reworkAlertCycles: settings.reworkAlertCycles,
        },
      });
    }

    // Map the user's role from membership
    const roleMap: Record<string, Role> = {
      owner_admin: 'admin',
      subadmin: 'subadmin',
      employee: 'employee',
    };
    const role = roleMap[membership.role] || 'admin';
    dispatch({
      type: 'SWITCH_USER',
      role,
      userId: viewer?.user ? String(viewer.user._id) : null,
    });

    // Mark onboarding as complete since they have an org
    dispatch({ type: 'FINISH_ONBOARDING' });
  }, [activeOrg, viewer?.user, dispatch]);

  // ── Sync tasks ──
  useEffect(() => {
    if (!tasksData) return;
    dispatch({ type: 'SET_TASKS', tasks: tasksData.scopedTasks });
    // Audit entries are empty from list view — they load per-task on detail
    dispatch({ type: 'SET_AUDIT', entries: tasksData.auditEntries || [] });
  }, [tasksData, dispatch]);

  // ── Sync availability ──
  useEffect(() => {
    if (!availabilityData) return;
    dispatch({ type: 'SET_AVAILABILITY', availability: availabilityData });
  }, [availabilityData, dispatch]);

  // ── Sync handoffs + check-ins ──
  useEffect(() => {
    if (!handoffsData) return;
    dispatch({ type: 'SET_HANDOFFS', handoffs: handoffsData.handoffs });
    dispatch({ type: 'SET_CHECKINS', checkIns: handoffsData.checkIns });
  }, [handoffsData, dispatch]);

  // ── Sync teams + memberships + sites into AppContext ──
  useEffect(() => {
    if (!teamsData || !membershipsData || !sitesData) return;

    // Build a site lookup
    const convexSites = sitesData as ConvexSiteDoc[];
    const convexTeams = teamsData as ConvexTeamDoc[];
    const convexMembers = membershipsData as ConvexMembershipEntry[];

    const siteMap = new Map<string, string>();
    for (const s of convexSites) {
      siteMap.set(String(s._id), s.name);
    }

    // Build team objects matching the Team type
    const teams: Team[] = convexTeams.map((ct) => {
      const teamId = String(ct._id);

      const leadEntry = convexMembers.find((m) => {
        if (ct.subadminMembershipId && String(m.membership._id) === String(ct.subadminMembershipId)) {
          return true;
        }
        return (
          m.membership.role === 'subadmin' &&
          m.membership.teamIds?.some((tid) => String(tid) === teamId)
        );
      });

      const memberEntries = convexMembers.filter((m) =>
        m.membership.role === 'employee' &&
        m.membership.teamIds?.some((tid) => String(tid) === teamId),
      );

      const leadEmployee: Employee = leadEntry
        ? {
            id: String(leadEntry.user._id),
            name: leadEntry.user.name,
            role: 'subadmin' as Role,
            email: leadEntry.user.email,
            phone: leadEntry.user.phone,
            teamId,
            teamName: ct.name,
            siteId: leadEntry.membership.siteIds?.[0] ? String(leadEntry.membership.siteIds[0]) : undefined,
            siteName: leadEntry.membership.siteIds?.[0] ? siteMap.get(String(leadEntry.membership.siteIds[0])) : undefined,
          }
        : {
            id: 'unknown',
            name: 'Unassigned Lead',
            role: 'subadmin' as Role,
            teamId,
            teamName: ct.name,
          };

      const members: Employee[] = memberEntries.map((m) => ({
        id: String(m.user._id),
        name: m.user.name,
        role: 'employee' as Role,
        email: m.user.email,
        phone: m.user.phone,
        teamId,
        teamName: ct.name,
        siteId: m.membership.siteIds?.[0] ? String(m.membership.siteIds[0]) : undefined,
        siteName: m.membership.siteIds?.[0] ? siteMap.get(String(m.membership.siteIds[0])) : undefined,
      }));

      return {
        id: teamId,
        name: ct.name,
        color: ct.color ?? '#059669',
        siteId: ct.siteId ? String(ct.siteId) : undefined,
        lead: leadEmployee,
        members: members.sort((a, b) => a.name.localeCompare(b.name)),
      };
    });

    const sites: Site[] = convexSites.map((s) => ({
      id: String(s._id),
      name: s.name,
    }));

    const teamLinkedIds = new Set(
      teams.flatMap((team) => [team.lead.id, ...team.members.map((member) => member.id)]),
    );

    const standaloneEmployees: Employee[] = convexMembers
      .filter((entry) => entry.membership.role !== 'owner_admin')
      .filter((entry) => !teamLinkedIds.has(String(entry.user._id)))
      .map((entry) => ({
        id: String(entry.user._id),
        name: entry.user.name,
        role: entry.membership.role === 'subadmin' ? ('subadmin' as Role) : ('employee' as Role),
        email: entry.user.email,
        phone: entry.user.phone,
        siteId: entry.membership.siteIds?.[0] ? String(entry.membership.siteIds[0]) : undefined,
        siteName: entry.membership.siteIds?.[0] ? siteMap.get(String(entry.membership.siteIds[0])) : undefined,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    dispatch({ type: 'SYNC_CONVEX_DATA', teams, sites, standaloneEmployees });
  }, [teamsData, membershipsData, sitesData, dispatch]);

  return null;
}
