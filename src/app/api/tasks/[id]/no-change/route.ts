import { NextRequest, NextResponse } from 'next/server';
import { ConvexActionError, markTaskNoChange } from '@/lib/server/convexActions';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const result = await markTaskNoChange({ taskId: id });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ConvexActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : 'Failed to mark no change';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
