import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ConvexActionError, markTaskNoChange } from '@/lib/server/convexActions';
import { checkRateLimit, getClientIp } from '@/utils/rateLimit';

const paramsSchema = z.object({
  id: z.string().min(1, 'Invalid task ID').max(200, 'Invalid task ID'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = checkRateLimit(getClientIp(request), { limit: 30, windowMs: 60_000, key: 'tasks-no-change' });
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  try {
    let parsedParams;
    try {
      parsedParams = paramsSchema.parse(await params);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: err.issues[0]?.message ?? 'Invalid task ID' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    const result = await markTaskNoChange({ taskId: parsedParams.id });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ConvexActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : 'Failed to mark no change';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
