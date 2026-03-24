import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * Post-auth callback handler.
 * Clerk redirects here after sign-in/sign-up.
 * Checks if user has a Clerk org — if yes, route to dashboard. If no, route to onboarding.
 */
export async function GET(request: Request) {
  const { userId, orgId, orgRole } = await auth();

  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  // User has an org with a role — send to their dashboard
  if (orgId && orgRole) {
    const dashboards: Record<string, string> = {
      'org:owner_admin': '/admin/overview',
      'org:subadmin': '/subadmin/overview',
      'org:employee': '/employee/my-day',
    };
    const dest = dashboards[orgRole] || '/admin/overview';
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // No org — needs onboarding
  return NextResponse.redirect(new URL('/onboarding', request.url));
}
