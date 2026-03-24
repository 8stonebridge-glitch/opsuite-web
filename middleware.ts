import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from '@convex-dev/auth/nextjs/server';

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)']);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (isPublicRoute(request)) return;

  try {
    const isAuthed = await convexAuth.isAuthenticated();
    if (!isAuthed) {
      const returnTo = request.nextUrl.pathname + request.nextUrl.search;
      const signInUrl = new URL('/sign-in', request.url);
      if (returnTo && returnTo !== '/' && returnTo !== '/sign-in') {
        signInUrl.searchParams.set('returnTo', returnTo);
      }
      return nextjsMiddlewareRedirect(request, signInUrl.pathname + signInUrl.search);
    }
  } catch {
    // Auth check failed (Convex unreachable, etc.) — redirect to sign-in as safe default
    return nextjsMiddlewareRedirect(request, '/sign-in');
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
