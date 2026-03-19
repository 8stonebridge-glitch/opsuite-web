import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  AdminPeopleError,
  deleteProvisionedPerson,
  updateProvisionedPerson,
} from '@/lib/server/adminPeople';
import { checkRateLimit, getClientIp } from '@/utils/rateLimit';

const updatePersonSchema = z.object({
  name: z.string().optional().default(''),
  email: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  password: z.string().optional(),
  siteId: z.string().optional().default(''),
  teamId: z.string().optional(),
});

const paramsSchema = z.object({
  userId: z.string().min(1, 'Invalid user ID'),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const rl = checkRateLimit(getClientIp(request), { limit: 20, windowMs: 60_000, key: 'admin-people-patch' });
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  try {
    let parsedParams;
    try {
      parsedParams = paramsSchema.parse(await params);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: err.issues[0]?.message ?? 'Invalid user ID' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    let body;
    try {
      body = updatePersonSchema.parse(await request.json());
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: err.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const result = await updateProvisionedPerson(parsedParams.userId, {
      name: body.name,
      email: body.email,
      phone: body.phone,
      password: body.password,
      siteId: body.siteId,
      teamId: body.teamId,
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
    let parsedParams;
    try {
      parsedParams = paramsSchema.parse(await params);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: err.issues[0]?.message ?? 'Invalid user ID' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const result = await deleteProvisionedPerson(parsedParams.userId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminPeopleError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : 'Failed to delete person';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
