'use client';

import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../providers/ThemeProvider';

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
}

export function Select({ label, placeholder = 'Select', options, value, onChange }: SelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const { isDark } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <span className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
          {label}
        </span>
      )}
      <button
        className="bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 py-3.5 flex items-center justify-between gap-2 w-full text-left"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <span className={`truncate max-w-[140px] ${selected ? 'text-base text-gray-900 dark:text-gray-100' : 'text-base text-gray-300 dark:text-gray-600'}`}>
          {selected?.label || placeholder}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke={isDark ? '#6b7280' : '#9ca3af'} strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-lg max-h-60 overflow-auto">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <span className="text-base font-bold text-gray-900 dark:text-gray-100">{label || 'Select'}</span>
            <button onClick={() => setOpen(false)} type="button" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {options.map((item) => (
            <button
              key={item.value}
              className={`px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between w-full text-left hover:bg-gray-50 dark:hover:bg-gray-800 ${
                item.value === value ? 'bg-emerald-50 dark:bg-emerald-950' : ''
              }`}
              onClick={() => {
                onChange(item.value);
                setOpen(false);
              }}
              type="button"
            >
              <span className={`text-base ${item.value === value ? 'font-semibold text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-gray-100'}`}>
                {item.label}
              </span>
              {item.value === value && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke={isDark ? '#34d399' : '#059669'} strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
