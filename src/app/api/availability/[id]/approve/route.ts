import { NextRequest, NextResponse } from 'next/server';
import { ConvexActionError, approveAvailability } from '@/lib/server/convexActions';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const result = await approveAvailability({ recordId: id });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ConvexActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : 'Failed to approve availability request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
