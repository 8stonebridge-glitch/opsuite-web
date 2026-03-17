import { NextRequest, NextResponse } from 'next/server';
import { AdminPeopleError, createProvisionedPerson } from '@/lib/server/adminPeople';
import { checkRateLimit, getClientIp } from '@/utils/rateLimit';

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(getClientIp(request), { limit: 20, windowMs: 60_000, key: 'admin-people' });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      phone?: string;
      password?: string;
      role?: 'subadmin' | 'employee';
      siteId?: string;
      teamId?: string;
    };

    const result = await createProvisionedPerson({
      name: body.name || '',
      email: body.email || '',
      phone: body.phone || '',
      password: body.password || '',
      role: body.role === 'subadmin' ? 'subadmin' : 'employee',
      siteId: body.siteId || '',
      teamId: body.teamId || undefined,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof AdminPeopleError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : 'Failed to create person';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
