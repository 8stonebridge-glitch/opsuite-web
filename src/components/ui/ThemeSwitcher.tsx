'use client';

import { useTheme, type ThemePreference } from '../../providers/ThemeProvider';

const OPTIONS: { value: ThemePreference; label: string; iconPath: string }[] = [
  { value: 'light', label: 'Light', iconPath: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z' },
  { value: 'system', label: 'System', iconPath: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { value: 'dark', label: 'Dark', iconPath: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z' },
];

export function ThemeSwitcher() {
  const { preference, setTheme, isDark } = useTheme();

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke={isDark ? '#6b7280' : '#9ca3af'} strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
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
              <svg xmlns="http://www.w3.org/2000/svg" className="h-[15px] w-[15px]" fill="none" viewBox="0 0 24 24" stroke={
                active
                  ? isDark
                    ? '#e5e7eb'
                    : '#111827'
                  : isDark
                    ? '#6b7280'
                    : '#9ca3af'
              } strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={opt.iconPath} />
              </svg>
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
