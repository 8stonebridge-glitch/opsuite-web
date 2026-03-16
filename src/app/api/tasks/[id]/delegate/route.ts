import { NextRequest, NextResponse } from 'next/server';
import { ConvexActionError, delegateTask } from '@/lib/server/convexActions';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { assigneeUserId?: string };

    if (!body.assigneeUserId) {
      return NextResponse.json({ error: 'Assignee is required' }, { status: 400 });
    }

    const result = await delegateTask({
      taskId: id,
      assigneeUserId: body.assigneeUserId,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ConvexActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : 'Failed to delegate task';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
