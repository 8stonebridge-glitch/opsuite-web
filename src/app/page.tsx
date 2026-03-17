import { redirect } from 'next/navigation';

/**
 * Root page — server-side redirect.
 *
 * Authenticated users are already redirected by middleware.ts.
 * If someone reaches this page, they're unauthenticated → send to sign-in.
 */
export default function HomePage() {
  redirect('/sign-in');
}
