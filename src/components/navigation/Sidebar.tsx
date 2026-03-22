'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useIndustryColor, useDashboardCounters } from '@/store/selectors';
import { useApp } from '@/store/AppContext';
import { useSession } from '@/providers/SessionProvider';
import { type AppRole, getSidebarItems, isPathActive } from './nav-config';

interface SidebarProps {
  role: AppRole;
}

export function Sidebar({ role }: SidebarProps) {
  const color = useIndustryColor();
  const counters = useDashboardCounters();
  const { state } = useApp();
  const { user } = useSession();
  const pathname = usePathname();
  const items = getSidebarItems(role);

  return (
    <aside className="hidden md:flex md:flex-col md:w-56 md:fixed md:inset-y-0 bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800 z-30">
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
              {state.onboarding.industry?.name || role}
            </p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {items.map((item) => {
          const isActive = isPathActive(pathname, item.href);
          return (
            <Link
              key={item.id}
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
              {item.badge === 'needsReview' && counters.needsReview > 0 && (
                <span className="ml-auto inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {counters.needsReview}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
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
  );
}
