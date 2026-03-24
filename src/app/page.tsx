import { redirect } from 'next/navigation';

/**
 * Root page — simple redirect fallback.
 *
 * The middleware handles auth checks and role-based routing.
 * This page only runs if middleware doesn't redirect first,
 * which means the user is unauthenticated.
 */
export default function HomePage() {
  redirect('/sign-in');
}
