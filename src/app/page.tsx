import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

/**
 * Root page — server-side redirect.
 *
 * Authenticated users → admin dashboard (ConvexDataBridge + useRoleRouter
 * handle role-based routing once the app loads).
 * Unauthenticated users → sign-in.
 *
 * NOTE: Middleware already redirects "/" → /admin/overview for authenticated
 * users, so this is a safety net in case middleware doesn't catch it.
 */
export default async function HomePage() {
  const { userId } = await auth();

  if (userId) {
    redirect('/admin/overview');
  }

  redirect('/sign-in');
}
