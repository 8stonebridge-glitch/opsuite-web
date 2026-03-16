'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useIndustryColor, useDashboardCounters } from '@/store/selectors';
import { useApp } from '@/store/AppContext';
import { useSession } from '@/providers/SessionProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { InboxButton } from '@/components/inbox/InboxButton';
import { Home, ClipboardList, MapPin, Users, Settings } from 'lucide-react';
import { type LucideIcon } from 'lucide-react';

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/admin/overview', label: 'Overview', icon: Home },
  { href: '/admin/tasks', label: 'Tasks', icon: ClipboardList },
  { href: '/admin/sites', label: 'Teams', icon: MapPin },
  { href: '/admin/people', label: 'People', icon: Users },
  { href: '/admin/more', label: 'More', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const color = useIndustryColor();
  const counters = useDashboardCounters();
  const { state } = useApp();
  const { user } = useSession();
  const { isDark } = useTheme();
  const pathname = usePathname();

  return (
    <ProtectedRoute>
    <div className="flex min-h-screen bg-surface-50 dark:bg-surface-950">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-56 md:fixed md:inset-y-0 bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800">
        {/* Logo + Org */}
        <div className="px-5 py-5 border-b border-surface-100 dark:border-surface-800">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-caption font-bold"
              style={{ backgroundColor: color }}
            >
              {(state.onboarding.orgName || 'O').charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-caption font-bold text-surface-900 dark:text-surface-100 truncate">
                {state.onboarding.orgName || 'OpSuite'}
              </h2>
              <p className="text-[11px] text-surface-400 dark:text-surface-500 truncate">
                {state.onboarding.industry?.name || 'Admin'}
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-caption font-medium transition-colors ${
                  isActive
                    ? 'bg-surface-100 dark:bg-surface-800 text-surface-900 dark:text-surface-100'
                    : 'text-surface-500 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800/50'
                }`}
                style={isActive ? { color } : undefined}
              >
                <item.icon className="size-[18px]" />
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

        {/* User info at bottom */}
        {user && (
          <div className="px-4 py-4 border-t border-surface-100 dark:border-surface-800">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-micro font-bold shrink-0"
                style={{ backgroundColor: color }}
              >
                {(user.name || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-caption font-medium text-surface-900 dark:text-surface-100 truncate">
                  {user.name}
                </p>
                <p className="text-[11px] text-surface-400 dark:text-surface-500 truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-micro font-bold shrink-0"
            style={{ backgroundColor: color }}
          >
            {(state.onboarding.orgName || 'O').charAt(0)}
          </div>
          <span className="text-caption font-bold text-surface-900 dark:text-surface-100 truncate">
            {state.onboarding.orgName || 'OpSuite'}
          </span>
        </div>
        <InboxButton />
      </div>

      {/* Main Content */}
      <main className="flex-1 md:ml-56 pt-14 md:pt-0 pb-24 md:pb-0">
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
