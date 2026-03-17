import { NextRequest, NextResponse } from 'next/server';
import { ConvexActionError, rejectAvailability } from '@/lib/server/convexActions';
import { checkRateLimit, getClientIp } from '@/utils/rateLimit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = checkRateLimit(getClientIp(request), { limit: 30, windowMs: 60_000, key: 'availability-reject' });
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  try {
    const { id } = await params;
    const result = await rejectAvailability({ recordId: id });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ConvexActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : 'Failed to reject availability request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
