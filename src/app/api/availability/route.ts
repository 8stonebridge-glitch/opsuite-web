import { NextRequest, NextResponse } from 'next/server';
import { ConvexActionError, createAvailabilityRequest } from '@/lib/server/convexActions';
import { checkRateLimit, getClientIp } from '@/utils/rateLimit';

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(getClientIp(request), { limit: 30, windowMs: 60_000, key: 'availability' });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }

  try {
    const body = (await request.json()) as {
      type?: 'leave' | 'sick' | 'off_duty';
      startDate?: string;
      endDate?: string;
      notes?: string;
    };

    if (!body.type) {
      return NextResponse.json({ error: 'Type is required' }, { status: 400 });
    }
    if (!body.startDate) {
      return NextResponse.json({ error: 'Start date is required' }, { status: 400 });
    }
    if (!body.endDate) {
      return NextResponse.json({ error: 'End date is required' }, { status: 400 });
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
