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

  // state.role uses 'admin' not 'owner_admin'
  const expectedRole = appRole === 'owner_admin' ? 'admin' : appRole;
  const roleMismatch = isMounted && state.onboardingComplete && state.role !== expectedRole;

  // Client-side role guard — redirect wrong-role users to root for re-routing.
  useEffect(() => {
    if (roleMismatch) {
      router.push('/');
    }
  }, [roleMismatch, router]);

  // Block rendering entirely when role doesn't match — prevents UI flash.
  if (roleMismatch) {
    return null;
  }

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
