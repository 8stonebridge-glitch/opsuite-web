import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/auth/bootstrap
 *
 * Returns the current user's session context:
 * - Clerk identity (id, email, name)
 * - Organization membership (stub for now — Phase 2 will resolve from Convex)
 *
 * This endpoint is called once on app load by SessionProvider.
 * Protected routes already require auth via middleware, so this
 * will only be called by authenticated users.
 */
export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ user: null, isSignedIn: false }, { status: 401 });
  }

  const user = await currentUser();

  if (!user) {
    return NextResponse.json({ user: null, isSignedIn: false }, { status: 401 });
  }

  // Phase 1: Return Clerk identity only.
  // Phase 2 will add: org, membership, role, sites, teams from Convex.
  return NextResponse.json({
    isSignedIn: true,
    user: {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress || '',
      name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.emailAddresses[0]?.emailAddress || 'User',
      imageUrl: user.imageUrl || null,
    },
    // Stub: will be populated in Phase 2
    org: null,
    membership: null,
    role: null,
  });
}
