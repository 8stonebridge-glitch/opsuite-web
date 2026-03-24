export const dynamic = 'force-dynamic';

/**
 * Root page — middleware handles auth redirect.
 * Authenticated users are routed by RoleRouterBridge on the client.
 * Unauthenticated users are redirected to /sign-in by middleware.
 */
export default function HomePage() {
  return null;
}
