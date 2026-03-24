import { redirect } from 'next/navigation';

/**
 * Root page — server-side redirect.
 *
 * With Convex Auth, server-side auth is handled by middleware.
 * Client-side guards handle role-based routing.
 * This page simply redirects to sign-in; authenticated users will be
 * redirected by the client-side RoleRouterBridge / ConvexDataBridge.
 */
export default function HomePage() {
  // Redirect to admin overview — client-side auth guards handle unauthenticated users
  // and let client-side auth guards handle unauthenticated users.
  redirect('/admin/overview');
}
