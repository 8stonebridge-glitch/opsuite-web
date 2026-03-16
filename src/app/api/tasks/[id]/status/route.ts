import { NextRequest, NextResponse } from 'next/server';
import { ConvexActionError, updateTaskStatus } from '@/lib/server/convexActions';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      status?: 'Open' | 'In Progress' | 'Submitted' | 'Pending Approval' | 'Verified';
      note?: string;
    };

    if (!body.status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    const result = await updateTaskStatus({
      taskId: id,
      status: body.status,
      note: body.note,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ConvexActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : 'Failed to update task status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
