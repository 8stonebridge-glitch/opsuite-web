import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

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
      let fetchQuery: typeof import('convex/nextjs').fetchQuery | undefined;
      let api: any;
      try {
        const convexNextjs = await import('convex/nextjs');
        fetchQuery = convexNextjs.fetchQuery;
        const convexApi = await import('./src/lib/convexApi');
        api = convexApi.api;
      } catch {
        // Convex imports failed — skip role checks, let client handle it
      }

      const { userId, getToken } = await auth();

      const token = await getToken({ template: 'convex' });

      // Server-side redirect: send "/" to the correct role dashboard instantly.
      if (pathname === '/') {
        if (userId && token && fetchQuery && api) {
          try {
            const active = await fetchQuery(api.organizations.active, {}, { token });
            const role = active?.membership?.role;
            const dashboard = role ? (ROLE_DASHBOARDS[role] || '/onboarding') : '/onboarding';
            const url = request.nextUrl.clone();
            url.pathname = dashboard;
            return NextResponse.redirect(url);
          } catch {
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
        return;
      }

      if (!token) {
        const url = request.nextUrl.clone();
        url.pathname = '/onboarding';
        return NextResponse.redirect(url);
      }

      if (fetchQuery && api) {
        try {
          const active = await fetchQuery(api.organizations.active, {}, { token });
          const role = active?.membership?.role;

          if (!role) {
            const url = request.nextUrl.clone();
            url.pathname = '/onboarding';
            return NextResponse.redirect(url);
          }

          const allowed =
            (isAdminRoute(request) && role === 'owner_admin') ||
            (isSubadminRoute(request) && role === 'subadmin') ||
            (isEmployeeRoute(request) && role === 'employee');

          if (!allowed) {
            const correctDashboard = ROLE_DASHBOARDS[role] || '/onboarding';
            const url = request.nextUrl.clone();
            url.pathname = correctDashboard;
            return NextResponse.redirect(url);
          }
        } catch {
          // Convex query failed — let client-side guards handle it
        }
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
