'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useIndustryColor, useDashboardCounters } from '@/store/selectors';
import { useTheme } from '@/providers/ThemeProvider';
import { type AppRole, getMobileTabs, isTabActive } from './nav-config';

interface BottomTabBarProps {
  role: AppRole;
}

export function BottomTabBar({ role }: BottomTabBarProps) {
  const color = useIndustryColor();
  const counters = useDashboardCounters();
  const { isDark } = useTheme();
  const pathname = usePathname();
  const tabs = getMobileTabs(role);
  const inactiveColor = isDark ? '#6b7280' : '#9ca3af';

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-surface-900 border-t border-surface-200 dark:border-surface-800 flex justify-around py-2 pb-[env(safe-area-inset-bottom)] z-50">
      {tabs.map((tab) => {
        const isActive = isTabActive(pathname, tab.matchPaths);
        const tabColor = isActive ? color : inactiveColor;

        return (
          <Link
            key={tab.id}
            href={tab.href}
            className="flex flex-col items-center gap-0.5 px-3 py-2 min-w-[44px] min-h-[44px] relative"
          >
            <span style={{ color: tabColor }}>
              <tab.icon className="size-5" />
            </span>
            <span className="text-[10px] font-medium" style={{ color: tabColor }}>
              {tab.label}
            </span>
            {tab.badge === 'needsReview' && counters.needsReview > 0 && (
              <span className="absolute -top-0.5 right-0 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold">
                {counters.needsReview}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
