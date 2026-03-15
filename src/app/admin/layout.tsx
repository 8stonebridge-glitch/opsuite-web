'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useIndustryColor, useDashboardCounters } from '../../../src/store/selectors';
import { useApp } from '../../../src/store/AppContext';
import { useTheme } from '../../../src/providers/ThemeProvider';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Home, ClipboardList, MapPin, Users, Settings } from 'lucide-react';
import { type LucideIcon } from 'lucide-react';

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/admin/overview', label: 'Overview', icon: Home },
  { href: '/admin/tasks', label: 'Tasks', icon: ClipboardList },
  { href: '/admin/sites', label: 'Sites', icon: MapPin },
  { href: '/admin/people', label: 'People', icon: Users },
  { href: '/admin/more', label: 'More', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const color = useIndustryColor();
  const counters = useDashboardCounters();
  const { state } = useApp();
  const { isDark } = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  if (state.role !== 'admin') {
    if (typeof window !== 'undefined') router.push('/');
    return null;
  }

  return (
    <ProtectedRoute>
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-56 md:fixed md:inset-y-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
        <div className="px-5 py-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">OpSuite</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500">Admin</p>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex justify-around py-2 pb-[env(safe-area-inset-bottom)] z-50">
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
