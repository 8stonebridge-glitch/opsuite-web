import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

const isAdminRoute = createRouteMatcher(['/admin(.*)']);
const isSubadminRoute = createRouteMatcher(['/subadmin(.*)']);
const isEmployeeRoute = createRouteMatcher(['/employee(.*)']);

// Map Clerk org role → dashboard path
const ROLE_DASHBOARDS: Record<string, string> = {
  'org:owner_admin': '/admin/overview',
  'org:subadmin': '/subadmin/overview',
  'org:employee': '/employee/my-day',
};

export default clerkMiddleware(
  async (auth, request) => {
    if (!isPublicRoute(request)) {
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
    const needsRoleCheck =
      isAdminRoute(request) || isSubadminRoute(request) || isEmployeeRoute(request);

    if (needsRoleCheck || pathname === '/') {
      const { userId, orgId, orgRole } = await auth();

      // Root redirect: use Clerk org role directly
      if (pathname === '/') {
        if (userId && orgId && orgRole) {
          const dashboard = ROLE_DASHBOARDS[orgRole] || '/admin/overview';
          const url = request.nextUrl.clone();
          url.pathname = dashboard;
          return NextResponse.redirect(url);
        }
        if (userId && !orgId) {
          // No org — send to onboarding
          const url = request.nextUrl.clone();
          url.pathname = '/onboarding';
          return NextResponse.redirect(url);
        }
        return;
      }

      // Role enforcement on route groups
      if (!orgId || !orgRole) {
        const url = request.nextUrl.clone();
        url.pathname = '/onboarding';
        return NextResponse.redirect(url);
      }

      const allowed =
        (isAdminRoute(request) && orgRole === 'org:owner_admin') ||
        (isSubadminRoute(request) && orgRole === 'org:subadmin') ||
        (isEmployeeRoute(request) && orgRole === 'org:employee');

      if (!allowed) {
        const correctDashboard = ROLE_DASHBOARDS[orgRole] || '/onboarding';
        const url = request.nextUrl.clone();
        url.pathname = correctDashboard;
        return NextResponse.redirect(url);
      }
    }
  },
  {
    signInUrl: '/sign-in',
    signUpUrl: '/sign-up',
  },
);

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
