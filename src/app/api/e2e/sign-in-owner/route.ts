import { NextResponse } from 'next/server';

/**
 * E2E sign-in endpoint.
 *
 * With Convex Auth, session creation is handled client-side via the
 * `signIn` action from `@convex-dev/auth/react` (Password provider).
 * The Clerk-based server-side session creation has been removed.
 *
 * E2E tests should sign in through the UI or by calling the Convex
 * Auth sign-in action directly from the test harness.
 */
export async function POST(request: Request) {
  if (process.env.PLAYWRIGHT_TEST !== '1') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(
    {
      error:
        'Server-side session creation is not supported with Convex Auth. ' +
        'Use the client-side signIn flow (Password provider) instead.',
    },
    { status: 501 },
  );
}
