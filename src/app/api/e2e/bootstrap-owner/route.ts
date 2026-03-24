import { NextResponse } from 'next/server';
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchAction, fetchMutation, fetchQuery } from 'convex/nextjs';
import { api } from '@/lib/convexApi';

export async function POST(request: Request) {
  if (process.env.PLAYWRIGHT_TEST !== '1') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const token = await convexAuthNextjsToken();

  if (!token) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  }

  await fetchAction(api.users.syncFromAuthAction, {}, { token });

  const activeOrg = await fetchQuery(api.organizations.active, {}, { token });
  if (!activeOrg?.organization) {
    return NextResponse.json(
      { error: 'No active organization was created for the signed-in owner yet.' },
      { status: 409 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { siteNames?: string[] };
  const requestedSiteNames = (body.siteNames || ['E2E Primary Site'])
    .map((value) => value.trim())
    .filter(Boolean);

  const existingSites = (await fetchQuery(api.sites.listForActiveOrganization, {}, { token })) as {
    _id: string;
    name: string;
  }[];
  const existingByName = new Map<string, { _id: string; name: string }>(
    existingSites.map((site) => [site.name.toLowerCase(), site]),
  );

  for (const siteName of requestedSiteNames) {
    if (!existingByName.has(siteName.toLowerCase())) {
      const createdSite = (await fetchMutation(api.sites.create, { name: siteName }, { token })) as {
        _id: string;
        name: string;
      };
      existingByName.set(siteName.toLowerCase(), createdSite);
    }
  }

  const sites = Array.from(existingByName.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((site) => ({
      id: String(site._id),
      name: site.name,
    }));

  return NextResponse.json({
    organizationId: String(activeOrg.organization._id),
    sites,
  });
}
