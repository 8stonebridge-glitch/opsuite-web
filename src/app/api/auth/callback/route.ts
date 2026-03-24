import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * Post-auth callback handler.
 * Keep this route as a compatibility shim for older auth redirects.
 * The primary post-auth landing route is now "/",
 * where middleware performs the role-aware redirect.
 */
export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    return NextResponse.redirect(new URL('/', request.url));
  } catch {
    return NextResponse.redirect(new URL('/', request.url));
  }
}
