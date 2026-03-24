import { NextResponse } from 'next/server';
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchAction, fetchQuery } from 'convex/nextjs';
import { api } from '@/lib/convexApi';

export async function GET() {
  if (process.env.PLAYWRIGHT_TEST !== '1') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const token = await convexAuthNextjsToken();
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

  // With Convex Auth, we identify the current user via the active org context
  const currentUserId = (activeOrg as any).user ? String((activeOrg as any).user._id) : undefined;

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

  // Find the current user's name from membership data
  const currentUserEntry = currentUserId
    ? (membershipsData as any[]).find((entry) => String(entry.user._id) === currentUserId)
    : undefined;
  const viewerName = currentUserEntry?.user?.name;

  return NextResponse.json({
    state: {
      adminName: viewerName,
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
      viewerName,
    },
  });
}
