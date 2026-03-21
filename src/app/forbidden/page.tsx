'use client';

import { useRouter } from 'next/navigation';
import { useSession } from '@/providers/SessionProvider';

const ROLE_DASHBOARDS: Record<string, string> = {
  owner_admin: '/admin/overview',
  subadmin: '/subadmin/overview',
  employee: '/employee/my-day',
};

export default function ForbiddenPage() {
  const router = useRouter();
  const { role } = useSession();

  const dashboard = (role && ROLE_DASHBOARDS[role]) || '/';

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950 px-6">
      <div className="text-center max-w-sm">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-6">
          <span className="text-3xl font-bold text-red-500">!</span>
        </div>
        <h1 className="text-display tracking-tight text-surface-900 dark:text-surface-100 mb-2">
          Access Denied
        </h1>
        <p className="text-body text-surface-400 dark:text-surface-500 mb-8">
          You don&apos;t have permission to view this page.
        </p>
        <button
          onClick={() => router.replace(dashboard)}
          className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
