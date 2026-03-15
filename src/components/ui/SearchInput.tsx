'use client';

import { useTheme } from '../../providers/ThemeProvider';

interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChangeText, placeholder = 'Search...' }: SearchInputProps) {
  const { isDark } = useTheme();

  return (
    <div className="relative mb-3">
      <div className="absolute left-4 top-3 z-10">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke={isDark ? '#6b7280' : '#9ca3af'} strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        value={value}
        onChange={(e) => onChangeText(e.target.value)}
        placeholder={placeholder}
        className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 pl-11 pr-4 py-3 text-sm text-gray-900 dark:text-gray-100 w-full outline-none placeholder:text-gray-300 dark:placeholder:text-gray-600"
      />
    </div>
  );
}
