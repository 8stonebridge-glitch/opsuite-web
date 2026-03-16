import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

export async function GET() {
  if (process.env.PLAYWRIGHT_TEST !== '1') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress || '',
      name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.emailAddresses[0]?.emailAddress || 'User',
      imageUrl: user.imageUrl || null,
    },
  });
}
