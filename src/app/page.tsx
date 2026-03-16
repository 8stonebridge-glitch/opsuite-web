import { redirect } from 'next/navigation';

/**
 * Root page — server-side redirect.
 *
 * This route is protected by Clerk middleware, so only signed-in users reach here.
 * Unauthenticated users are redirected to /sign-in by the middleware before this runs.
 *
 * All signed-in users go to /admin/overview (temporary — Phase 2 will resolve role).
 */
export default function HomePage() {
  redirect('/admin/overview');
}
