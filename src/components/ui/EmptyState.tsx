'use client';

import { useTheme } from '../../providers/ThemeProvider';

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  const { isDark } = useTheme();

  return (
    <div className="py-16 flex flex-col items-center">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke={isDark ? '#4b5563' : '#d1d5db'} strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
      <span className="text-gray-400 dark:text-gray-500 text-sm mt-3 font-medium">{title}</span>
      {subtitle && <span className="text-gray-300 dark:text-gray-600 text-xs mt-1">{subtitle}</span>}
    </div>
  );
}
