import { NextRequest, NextResponse } from 'next/server';
import { ConvexActionError, createTask } from '@/lib/server/convexActions';
import { checkRateLimit, getClientIp } from '@/utils/rateLimit';

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(getClientIp(request), { limit: 60, windowMs: 60_000, key: 'tasks' });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }

  try {
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      priority?: 'low' | 'medium' | 'critical';
      siteId?: string;
      teamId?: string;
      assigneeUserId?: string;
      dueDate?: string;
      note?: string;
    };

    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!body.priority) {
      return NextResponse.json({ error: 'Priority is required' }, { status: 400 });
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
