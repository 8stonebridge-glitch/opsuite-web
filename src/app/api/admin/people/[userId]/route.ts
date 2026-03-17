import { NextRequest, NextResponse } from 'next/server';
import {
  AdminPeopleError,
  deleteProvisionedPerson,
  updateProvisionedPerson,
} from '@/lib/server/adminPeople';
import { checkRateLimit, getClientIp } from '@/utils/rateLimit';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const rl = checkRateLimit(getClientIp(request), { limit: 20, windowMs: 60_000, key: 'admin-people-patch' });
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  try {
    const { userId } = await params;
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      phone?: string;
      password?: string;
      siteId?: string;
      teamId?: string;
    };

    const result = await updateProvisionedPerson(userId, {
      name: body.name || '',
      email: body.email || '',
      phone: body.phone || '',
      password: body.password || undefined,
      siteId: body.siteId || '',
      teamId: body.teamId || undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminPeopleError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : 'Failed to update person';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const rl = checkRateLimit(getClientIp(request), { limit: 10, windowMs: 60_000, key: 'admin-people-delete' });
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  try {
    const { userId } = await params;
    const result = await deleteProvisionedPerson(userId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminPeopleError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : 'Failed to delete person';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
