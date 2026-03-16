import { NextRequest, NextResponse } from 'next/server';
import { ConvexActionError, requestTaskRework } from '@/lib/server/convexActions';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { reason?: string };

    if (!body.reason?.trim()) {
      return NextResponse.json({ error: 'Rework reason is required' }, { status: 400 });
    }

    const result = await requestTaskRework({
      taskId: id,
      reason: body.reason,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ConvexActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : 'Failed to request rework';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
