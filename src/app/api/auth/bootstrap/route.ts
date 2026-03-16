import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/auth/bootstrap
 *
 * Returns the current user's session context:
 * - Clerk identity (id, email, name, imageUrl)
 * - role: 'admin' for all signed-in users (temporary — Phase 2 will resolve from backend)
 *
 * Called once on app load by SessionProvider.
 */
export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ user: null, isSignedIn: false, role: null }, { status: 401 });
  }

  const user = await currentUser();

  if (!user) {
    return NextResponse.json({ user: null, isSignedIn: false, role: null }, { status: 401 });
  }

  return NextResponse.json({
    isSignedIn: true,
    user: {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress || '',
      name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.emailAddresses[0]?.emailAddress || 'User',
      imageUrl: user.imageUrl || null,
    },
    // Temporary: all signed-in users are treated as admin.
    // Phase 2 will resolve role from backend membership records.
    role: 'admin' as const,
  });
}
