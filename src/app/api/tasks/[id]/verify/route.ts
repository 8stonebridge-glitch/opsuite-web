import { NextRequest, NextResponse } from 'next/server';
import { ConvexActionError, verifyTask } from '@/lib/server/convexActions';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const result = await verifyTask({ taskId: id });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ConvexActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : 'Failed to verify task';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
