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
  const { preference, setTheme } = useTheme();

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Sun className="h-[18px] w-[18px] text-surface-400 dark:text-surface-500" strokeWidth={2} />
        <span className="text-body text-surface-700 dark:text-surface-300">
          Appearance
        </span>
      </div>
      <div className="flex bg-surface-100 dark:bg-surface-800 rounded-input p-1">
        {OPTIONS.map((opt) => {
          const active = preference === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg transition-colors ${
                active
                  ? 'bg-white dark:bg-surface-700 shadow-card'
                  : ''
              }`}
              type="button"
            >
              <opt.Icon
                className={`h-[15px] w-[15px] ${
                  active
                    ? 'text-surface-900 dark:text-surface-200'
                    : 'text-surface-400 dark:text-surface-500'
                }`}
                strokeWidth={2}
              />
              <span
                className={`text-caption font-semibold ${
                  active
                    ? 'text-surface-900 dark:text-surface-100'
                    : 'text-surface-400 dark:text-surface-500'
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
