'use client';

import { useIndustryColor } from '@/store/selectors';
import { useApp } from '@/store/AppContext';

export function MobileHeader() {
  const color = useIndustryColor();
  const { state } = useApp();

  return (
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
    </div>
  );
}
