import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AdminPeopleError, createProvisionedPerson } from '@/lib/server/adminPeople';
import { checkRateLimit, getClientIp } from '@/utils/rateLimit';

const createPersonSchema = z.object({
  name: z.string().optional().default(''),
  email: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  password: z.string().optional().default(''),
  role: z.enum(['subadmin', 'employee']).optional().default('employee'),
  siteId: z.string().optional().default(''),
  teamId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(getClientIp(request), { limit: 20, windowMs: 60_000, key: 'admin-people' });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }

  try {
    let body;
    try {
      body = createPersonSchema.parse(await request.json());
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: err.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const result = await createProvisionedPerson({
      name: body.name,
      email: body.email,
      phone: body.phone,
      password: body.password,
      role: body.role,
      siteId: body.siteId,
      teamId: body.teamId,
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
