import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ConvexActionError, completeHandoff } from '@/lib/server/convexActions';
import { checkRateLimit, getClientIp } from '@/utils/rateLimit';

const completeHandoffSchema = z.object({
  date: z.string().min(1, 'Date is required'),
});

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(getClientIp(request), { limit: 20, windowMs: 60_000, key: 'handoffs-complete' });
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  try {
    let body;
    try {
      body = completeHandoffSchema.parse(await request.json());
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: err.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const result = await completeHandoff({ date: body.date });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ConvexActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : 'Failed to complete handoff';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
