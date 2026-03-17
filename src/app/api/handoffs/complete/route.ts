import { NextRequest, NextResponse } from 'next/server';
import { ConvexActionError, completeHandoff } from '@/lib/server/convexActions';
import { checkRateLimit, getClientIp } from '@/utils/rateLimit';

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(getClientIp(request), { limit: 20, windowMs: 60_000, key: 'handoffs-complete' });
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  try {
    const body = (await request.json()) as { date?: string };

    if (!body.date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
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
