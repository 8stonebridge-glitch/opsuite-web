import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { fetchAction, fetchQuery } from 'convex/nextjs';
import { api } from '@/lib/convexApi';
import { resolveConvexTokenForRequest } from '@/lib/server/adminPeople';

export async function GET() {
  if (process.env.PLAYWRIGHT_TEST !== '1') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { userId, sessionId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json({ state: null }, { status: 200 });
  }

  const token = await resolveConvexTokenForRequest({ getToken, sessionId });
  if (!token) {
    return NextResponse.json({ state: null }, { status: 200 });
  }

  await fetchAction(api.users.syncFromAuthAction, {}, { token });

  const [activeOrg, sitesData, membershipsData] = await Promise.all([
    fetchQuery(api.organizations.active, {}, { token }),
    fetchQuery(api.sites.listForActiveOrganization, {}, { token }),
    fetchQuery(api.memberships.listForActiveOrganization, {}, { token }),
  ]);

  if (!activeOrg?.organization || !activeOrg.membership) {
    return NextResponse.json({ state: null }, { status: 200 });
  }

  const sites = (sitesData as any[]).map((site) => ({
    id: String(site._id),
    name: site.name,
  }));
  const siteMap = new Map(sites.map((site) => [site.id, site.name]));

  const standaloneEmployees = (membershipsData as any[])
    .filter((entry) => entry.membership.role !== 'owner_admin')
    .map((entry) => ({
      id: String(entry.user._id),
      name: entry.user.name,
      role: entry.membership.role === 'subadmin' ? 'subadmin' : 'employee',
      email: entry.user.email,
      phone: entry.user.phone,
      teamId: entry.membership.teamIds?.[0] ? String(entry.membership.teamIds[0]) : undefined,
      siteId: entry.membership.siteIds?.[0] ? String(entry.membership.siteIds[0]) : undefined,
      siteName: entry.membership.siteIds?.[0]
        ? siteMap.get(String(entry.membership.siteIds[0]))
        : undefined,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({
    state: {
      adminName: (membershipsData as any[]).find((entry) => String(entry.user.authUserId) === userId)?.user?.name ?? undefined,
      membershipRole: activeOrg.membership.role,
      orgName: activeOrg.organization.name,
      orgMode: activeOrg.organization.mode,
      settings: activeOrg.settings
        ? {
            noChangeAlertWorkdays: activeOrg.settings.noChangeAlertWorkdays,
            reworkAlertCycles: activeOrg.settings.reworkAlertCycles,
          }
        : null,
      sites,
      standaloneEmployees,
      viewerName: (membershipsData as any[]).find((entry) => String(entry.user.authUserId) === userId)?.user?.name,
    },
  });
}
