import { NextResponse } from 'next/server';
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '@/lib/convexApi';

export async function GET() {
  if (process.env.PLAYWRIGHT_TEST !== '1') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const token = await convexAuthNextjsToken();
  if (!token) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  // Fetch the current user's info from Convex instead of Clerk
  const active = await fetchQuery(api.organizations.active, {}, { token }) as any;
  if (!active?.user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  return NextResponse.json({
    user: {
      id: String(active.user._id),
      email: active.user.email || '',
      name: active.user.name || active.user.email || 'User',
      imageUrl: active.user.imageUrl || null,
    },
  });
}
