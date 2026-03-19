'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useIndustryColor, useDashboardCounters } from '@/store/selectors';
import { useApp } from '@/store/AppContext';
import { useTheme } from '@/providers/ThemeProvider';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Home, ClipboardList, Bell, Users, Settings } from 'lucide-react';
import { type LucideIcon } from 'lucide-react';

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/subadmin/overview', label: 'Overview', icon: Home },
  { href: '/subadmin/tasks', label: 'Tasks', icon: ClipboardList },
  { href: '/subadmin/check-ins', label: 'Check-ins', icon: Bell },
  { href: '/subadmin/people', label: 'Team', icon: Users },
  { href: '/subadmin/more', label: 'More', icon: Settings },
];

export default function SubAdminLayout({ children }: { children: React.ReactNode }) {
  const color = useIndustryColor();
  const counters = useDashboardCounters();
  const { state } = useApp();
  const { isDark } = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  // Mounted flag — server and client render identical initial HTML
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Client-side role guard for UX (redirects wrong-role users to correct dashboard).
  // Security enforcement happens server-side in Convex functions via requireCurrentUser + role checks.
  // This guard prevents UI flash, not unauthorized data access.
  useEffect(() => {
    if (isMounted && state.onboardingComplete && state.role !== 'subadmin') {
      router.push('/');
    }
  }, [isMounted, state.onboardingComplete, state.role, router]);

  return (
    <ProtectedRoute>
    <div className="flex min-h-screen bg-surface-50 dark:bg-surface-950">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-56 md:fixed md:inset-y-0 bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800">
        <div className="px-5 py-6">
          <h2 className="text-title text-surface-900 dark:text-surface-100">OpSuite</h2>
          <p className="text-micro text-surface-400 dark:text-surface-500">Team Lead</p>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-body font-medium transition-colors ${
                  isActive
                    ? 'bg-surface-100 dark:bg-surface-800 text-surface-900 dark:text-surface-100'
                    : 'text-surface-500 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800/50'
                }`}
                style={isActive ? { color } : undefined}
              >
                <item.icon className="size-4" />
                {item.label}
                {item.label === 'Tasks' && counters.needsReview > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                    {counters.needsReview}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-56 pb-24 md:pb-0">
        <div className="max-w-6xl mx-auto px-0 lg:px-4">{children}</div>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-surface-900 border-t border-surface-200 dark:border-surface-800 flex justify-around py-2 pb-[env(safe-area-inset-bottom)] z-50">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 px-3 py-2 min-w-[44px] min-h-[44px] relative"
            >
              <span style={{ color: isActive ? color : isDark ? '#6b7280' : '#9ca3af' }}>
                <item.icon className="size-5" />
              </span>
              <span
                className="text-[10px] font-medium"
                style={{ color: isActive ? color : isDark ? '#6b7280' : '#9ca3af' }}
              >
                {item.label}
              </span>
              {item.label === 'Tasks' && counters.needsReview > 0 && (
                <span className="absolute -top-0.5 right-0 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold">
                  {counters.needsReview}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
    </ProtectedRoute>
  );
}
