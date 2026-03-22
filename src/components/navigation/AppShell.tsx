'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useHydrated } from '@/hooks/useHydrated';
import { useApp } from '@/store/AppContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Sidebar } from './Sidebar';
import { BottomTabBar } from './BottomTabBar';
import { MobileHeader } from './MobileHeader';
import { type AppRole } from './nav-config';

interface AppShellProps {
  appRole: AppRole;
  children: React.ReactNode;
}

export function AppShell({ appRole, children }: AppShellProps) {
  const { state } = useApp();
  const router = useRouter();
  const isMounted = useHydrated();

  // Client-side role guard for UX — prevents UI flash for wrong-role users.
  // Security enforcement happens server-side in Convex via requireCurrentUser + role checks.
  useEffect(() => {
    if (!isMounted || !state.onboardingComplete) return;
    // state.role uses 'admin' not 'owner_admin'
    const expectedRole = appRole === 'owner_admin' ? 'admin' : appRole;
    if (state.role !== expectedRole) {
      router.push('/');
    }
  }, [isMounted, state.onboardingComplete, state.role, appRole, router]);

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-surface-50 dark:bg-surface-950">
        <Sidebar role={appRole} />
        <MobileHeader />
        <main className="flex-1 md:ml-56 pt-14 md:pt-0 pb-24 md:pb-0">
          <div className="max-w-6xl mx-auto px-0 lg:px-4">{children}</div>
        </main>
        <BottomTabBar role={appRole} />
      </div>
    </ProtectedRoute>
  );
}
