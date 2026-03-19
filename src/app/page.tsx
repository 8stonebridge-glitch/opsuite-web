import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

/**
 * Root page — server-side redirect.
 *
 * Authenticated users → onboarding (to create org if needed) or admin dashboard.
 * Unauthenticated users → sign-in.
 */
export default async function HomePage() {
  const { userId } = await auth();

  if (userId) {
    redirect('/onboarding');
  }

  redirect('/sign-in');
}
