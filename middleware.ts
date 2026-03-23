import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '@/lib/convexApi';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

// Routes that need auth but should not trigger role checks or Convex queries.
// After sign-up, the session handshake may still be in-flight — heavy role
// resolution would fail and cause a redirect loop.
const isOnboardingRoute = createRouteMatcher(['/onboarding(.*)']);

// Role-gated route groups — server-side enforcement (FLOW-UNI-03)
const isAdminRoute = createRouteMatcher(['/admin(.*)']);
const isSubadminRoute = createRouteMatcher(['/subadmin(.*)']);
const isEmployeeRoute = createRouteMatcher(['/employee(.*)']);

// Map role → allowed dashboard prefix for redirects after denial
const ROLE_DASHBOARDS: Record<string, string> = {
  owner_admin: '/admin/overview',
  subadmin: '/subadmin/overview',
  employee: '/employee/my-day',
};

export default clerkMiddleware(
  async (auth, request) => {
    if (!isPublicRoute(request)) {
      // FEAT-AUTH-08: Preserve returnTo URL so user lands back after sign-in
      const returnTo = request.nextUrl.pathname + request.nextUrl.search;
      const signInUrl = new URL('/sign-in', request.url);
      if (returnTo && returnTo !== '/' && returnTo !== '/sign-in') {
        signInUrl.searchParams.set('returnTo', returnTo);
      }
      await auth.protect({
        unauthenticatedUrl: signInUrl.toString(),
      });
    }

    const pathname = request.nextUrl.pathname;

    // Server-side role enforcement: query Convex (production deployment via
    // NEXT_PUBLIC_CONVEX_URL) to verify the user's role before rendering
    // any role-gated route group.
    const needsRoleCheck =
      isAdminRoute(request) || isSubadminRoute(request) || isEmployeeRoute(request);

    // Single auth() call covers both role-check and root-redirect paths to avoid
    // redundant authentication round-trips within the same request.
    if (needsRoleCheck || pathname === '/') {
      const { userId, getToken } = await auth();

      const token = await getToken({ template: 'convex' });

      // Server-side redirect: send "/" to the correct role dashboard instantly.
      if (pathname === '/') {
        if (userId && token) {
          try {
            const active = await fetchQuery(api.organizations.active, {}, { token });
            const role = active?.membership?.role;
            const dashboard = role ? (ROLE_DASHBOARDS[role] || '/onboarding') : '/onboarding';
            const url = request.nextUrl.clone();
            url.pathname = dashboard;
            return NextResponse.redirect(url);
          } catch {
            // Convex unavailable — send to onboarding as safe default
            const url = request.nextUrl.clone();
            url.pathname = '/onboarding';
            return NextResponse.redirect(url);
          }
        }
        if (userId && !token) {
          const url = request.nextUrl.clone();
          url.pathname = '/onboarding';
          return NextResponse.redirect(url);
        }
        return; // Unauthenticated — auth.protect() already redirected above.
      }

      if (!token) {
        // No Convex token — user may not have completed onboarding yet.
        // Redirect to onboarding instead of blocking.
        const url = request.nextUrl.clone();
        url.pathname = '/onboarding';
        return NextResponse.redirect(url);
      }

      try {
        const active = await fetchQuery(api.organizations.active, {}, { token });
        const role = active?.membership?.role;

        if (!role) {
          // No org/membership — redirect to onboarding
          const url = request.nextUrl.clone();
          url.pathname = '/onboarding';
          return NextResponse.redirect(url);
        }

        // Check role against route group
        const allowed =
          (isAdminRoute(request) && role === 'owner_admin') ||
          (isSubadminRoute(request) && role === 'subadmin') ||
          (isEmployeeRoute(request) && role === 'employee');

        if (!allowed) {
          // Redirect to the user's correct dashboard instead of showing a 403
          const correctDashboard = ROLE_DASHBOARDS[role] || '/onboarding';
          const url = request.nextUrl.clone();
          url.pathname = correctDashboard;
          return NextResponse.redirect(url);
        }
      } catch {
        // Convex query failed (network, cold start, etc.) — let client-side
        // guards handle it rather than redirecting to onboarding (which would
        // loop for users who already have an org). The AppShell role guard
        // and useRoleRouter will redirect if the role doesn't match.
      }
    }
  },
  {
    // Hardcoded as safety net — env vars have been corrupted with trailing \n before
    signInUrl: '/sign-in',
    signUpUrl: '/sign-up',
  },
);

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
