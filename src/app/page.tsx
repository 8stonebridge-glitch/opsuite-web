import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { resolveServerAccess } from '@/lib/clerkAuth';

/**
 * Root page — server-side auth recovery.
 *
 * Middleware handles the common cases first. If the request reaches this page,
 * we still resolve against Clerk so a signed-in user is never mistaken for a
 * signed-out one during org/role hydration drift.
 */
export default async function HomePage() {
  const access = resolveServerAccess(await auth());

  if (access.destination) {
    redirect(access.destination);
  }

  return (
    <main className="min-h-screen bg-surface-50 dark:bg-surface-950 flex items-center justify-center px-6">
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <p className="text-lg font-semibold text-surface-900 dark:text-surface-100">
          Finishing workspace access
        </p>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-surface-200 border-t-emerald-600 dark:border-surface-700 dark:border-t-emerald-400" />
        <p className="text-sm text-surface-500 dark:text-surface-400">
          Your account is signed in. We&apos;re still resolving your organization role before sending
          you to the right workspace.
        </p>
      </div>
    </main>
  );
}
