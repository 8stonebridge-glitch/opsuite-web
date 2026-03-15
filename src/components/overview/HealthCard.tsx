'use client';

import { type ReactNode } from 'react';
import { useTheme } from '../../providers/ThemeProvider';

export interface StatPill {
  label: string;
  value: number | string;
  color: string;
}

interface HealthCardProps {
  title: string;
  subtitle?: string;
  icon?: string;
  iconColor?: string;
  stats: StatPill[];
  onPress?: () => void;
  rightContent?: ReactNode;
}

export function HealthCard({ title, subtitle, icon, iconColor, stats, onPress, rightContent }: HealthCardProps) {
  const { isDark } = useTheme();

  const Wrapper = onPress ? 'button' : 'div';

  return (
    <Wrapper
      onClick={onPress}
      className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 w-full text-left"
      type={onPress ? 'button' : undefined}
    >
      <div className="flex items-center gap-3 mb-3">
        {icon && (
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
            style={{ backgroundColor: (iconColor || '#059669') + '15' }}
          >
            <span style={{ color: iconColor || '#059669' }}>
              {icon.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1">
          <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</span>
          {subtitle && <span className="block text-xs text-gray-400 dark:text-gray-500">{subtitle}</span>}
        </div>
        {rightContent}
        {onPress && (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke={isDark ? '#4b5563' : '#d1d5db'} strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>

      <div className="flex gap-2">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="flex-1 rounded-xl py-2 px-2 flex flex-col items-center"
            style={{ backgroundColor: stat.color + (isDark ? '20' : '10') }}
          >
            <span className="text-base font-bold" style={{ color: stat.color }}>
              {stat.value}
            </span>
            <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-0.5">
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </Wrapper>
  );
}
