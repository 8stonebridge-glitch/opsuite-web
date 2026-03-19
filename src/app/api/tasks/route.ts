import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ConvexActionError, createTask } from '@/lib/server/convexActions';
import { checkRateLimit, getClientIp } from '@/utils/rateLimit';

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'critical'], 'Priority is required'),
  siteId: z.string().optional(),
  teamId: z.string().optional(),
  assigneeUserId: z.string().optional(),
  dueDate: z.string().optional(),
  note: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(getClientIp(request), { limit: 60, windowMs: 60_000, key: 'tasks' });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }

  try {
    let body;
    try {
      body = createTaskSchema.parse(await request.json());
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: err.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const result = await createTask({
      title: body.title,
      description: body.description,
      priority: body.priority,
      siteId: body.siteId,
      teamId: body.teamId,
      assigneeUserId: body.assigneeUserId,
      dueDate: body.dueDate,
      note: body.note,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ConvexActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : 'Failed to create task';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
