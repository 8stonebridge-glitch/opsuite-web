import { NextRequest, NextResponse } from 'next/server';
import { ConvexActionError, addTaskNote } from '@/lib/server/convexActions';
import { checkRateLimit, getClientIp } from '@/utils/rateLimit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = checkRateLimit(getClientIp(request), { limit: 60, windowMs: 60_000, key: 'tasks-note' });
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  try {
    const { id } = await params;
    const body = (await request.json()) as { message?: string };

    if (!body.message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const result = await addTaskNote({ taskId: id, message: body.message });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ConvexActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : 'Failed to add note';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
