import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ConvexActionError, createAvailabilityRequest } from '@/lib/server/convexActions';
import { checkRateLimit, getClientIp } from '@/utils/rateLimit';

const availabilitySchema = z.object({
  type: z.enum(['leave', 'sick', 'off_duty'], 'Type is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(getClientIp(request), { limit: 30, windowMs: 60_000, key: 'availability' });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }

  try {
    let body;
    try {
      body = availabilitySchema.parse(await request.json());
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: err.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const result = await createAvailabilityRequest({
      type: body.type,
      startDate: body.startDate,
      endDate: body.endDate,
      notes: body.notes,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ConvexActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : 'Failed to create availability request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
