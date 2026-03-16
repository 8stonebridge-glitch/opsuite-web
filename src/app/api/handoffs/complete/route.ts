import { NextRequest, NextResponse } from 'next/server';
import { ConvexActionError, completeHandoff } from '@/lib/server/convexActions';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { date?: string };

    if (!body.date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    const result = await completeHandoff({ date: body.date });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ConvexActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : 'Failed to complete handoff';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
