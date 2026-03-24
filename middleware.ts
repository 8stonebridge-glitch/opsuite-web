import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { resolveServerAccess } from '@/lib/clerkAuth';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/auth/callback(.*)',
]);

const isAdminRoute = createRouteMatcher(['/admin(.*)']);
const isSubadminRoute = createRouteMatcher(['/subadmin(.*)']);
const isEmployeeRoute = createRouteMatcher(['/employee(.*)']);

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
      const authState = await auth();
      const access = resolveServerAccess(authState);

      if (pathname === '/') {
        if (access.destination) {
          const url = request.nextUrl.clone();
          url.pathname = access.destination;
          return NextResponse.redirect(url);
        }
        return;
      }

      if (access.status === 'needs_onboarding') {
        const url = request.nextUrl.clone();
        url.pathname = '/onboarding';
        return NextResponse.redirect(url);
      }

      if (access.status === 'unresolved_role') {
        const url = request.nextUrl.clone();
        url.pathname = '/';
        return NextResponse.redirect(url);
      }

      if (access.status !== 'dashboard') {
        return;
      }

      const allowed =
        (isAdminRoute(request) && access.appRole === 'admin') ||
        (isSubadminRoute(request) && access.appRole === 'subadmin') ||
        (isEmployeeRoute(request) && access.appRole === 'employee');

      if (!allowed) {
        const url = request.nextUrl.clone();
        url.pathname = access.destination;
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
