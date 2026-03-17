import { NextRequest, NextResponse } from 'next/server';
import { ConvexActionError, updateTaskStatus } from '@/lib/server/convexActions';

const VALID_STATUSES = [
  'Open',
  'In Progress',
  'Submitted',
  'Pending Approval',
  'Verified',
] as const;

type TaskStatus = (typeof VALID_STATUSES)[number];

function isValidStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && (VALID_STATUSES as readonly string[]).includes(value);
}

function isValidTaskId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length < 200;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!isValidTaskId(id)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (!isValidStatus(body.status)) {
      return NextResponse.json(
        { error: `Status must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 },
      );
    }

    const note = typeof body.note === 'string' ? body.note.slice(0, 1000) : undefined;

    const result = await updateTaskStatus({ taskId: id, status: body.status, note });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ConvexActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : 'Failed to update task status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
