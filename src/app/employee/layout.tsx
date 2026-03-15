'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useIndustryColor } from '../../../src/store/selectors';
import { useApp } from '../../../src/store/AppContext';
import { useTheme } from '../../../src/providers/ThemeProvider';

const NAV_ITEMS = [
  { href: '/employee/my-day', label: 'My Day', icon: '\u2600' },
  { href: '/employee/tasks', label: 'Tasks', icon: '\u{1F4CB}' },
  { href: '/employee/check-in', label: 'Handoff', icon: '\u{1F91A}' },
  { href: '/employee/more', label: 'More', icon: '\u2699' },
];

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const color = useIndustryColor();
  const { state } = useApp();
  const { isDark } = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  if (state.role !== 'employee') {
    if (typeof window !== 'undefined') router.push('/');
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-56 md:fixed md:inset-y-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
        <div className="px-5 py-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">OpSuite</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500">Employee</p>
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
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-56 pb-20 md:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex justify-around py-2 z-50">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 px-2 py-1"
            >
              <span className="text-lg" style={{ color: isActive ? color : isDark ? '#6b7280' : '#9ca3af' }}>
                {item.icon}
              </span>
              <span
                className="text-[10px] font-medium"
                style={{ color: isActive ? color : isDark ? '#6b7280' : '#9ca3af' }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
