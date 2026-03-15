'use client';

import { useTheme, type ThemePreference } from '../../providers/ThemeProvider';
import { Sun, Monitor, Moon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const OPTIONS: { value: ThemePreference; label: string; Icon: LucideIcon }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'system', label: 'System', Icon: Monitor },
  { value: 'dark', label: 'Dark', Icon: Moon },
];

export function ThemeSwitcher() {
  const { preference, setTheme, isDark } = useTheme();

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Sun className="h-[18px] w-[18px] text-gray-400 dark:text-gray-500" strokeWidth={2} />
        <span className="text-sm text-gray-700 dark:text-gray-300">
          Appearance
        </span>
      </div>
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
        {OPTIONS.map((opt) => {
          const active = preference === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg ${
                active
                  ? 'bg-white dark:bg-gray-700 shadow-sm'
                  : ''
              }`}
              type="button"
            >
              <opt.Icon
                className={`h-[15px] w-[15px] ${
                  active
                    ? 'text-gray-900 dark:text-gray-200'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
                strokeWidth={2}
              />
              <span
                className={`text-xs font-semibold ${
                  active
                    ? 'text-gray-900 dark:text-gray-100'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
