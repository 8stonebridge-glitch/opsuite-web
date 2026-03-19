import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ConvexActionError, updateTaskStatus } from '@/lib/server/convexActions';
import { checkRateLimit, getClientIp } from '@/utils/rateLimit';

const VALID_STATUSES = [
  'Open',
  'In Progress',
  'Submitted',
  'Pending Approval',
  'Verified',
] as const;

const updateStatusSchema = z.object({
  status: z.enum(VALID_STATUSES, `Status must be one of: ${VALID_STATUSES.join(', ')}`),
  note: z.string().max(1000).optional(),
});

const paramsSchema = z.object({
  id: z.string().min(1, 'Invalid task ID').max(200, 'Invalid task ID'),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = checkRateLimit(getClientIp(request), { limit: 60, windowMs: 60_000, key: 'tasks-status' });
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

    let body;
    try {
      body = updateStatusSchema.parse(await request.json());
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: err.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const result = await updateTaskStatus({ taskId: parsedParams.id, status: body.status, note: body.note });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ConvexActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : 'Failed to update task status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
