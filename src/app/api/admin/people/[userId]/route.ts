import { NextRequest, NextResponse } from 'next/server';
import {
  AdminPeopleError,
  deleteProvisionedPerson,
  updateProvisionedPerson,
} from '@/lib/server/adminPeople';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
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
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
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
