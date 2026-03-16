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
        <span className="block text-caption font-semibold text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2">
          {label}
        </span>
      )}
      <button
        className="bg-surface-50 dark:bg-surface-800 rounded-card px-4 py-3.5 flex items-center justify-between gap-2 w-full text-left"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <span className={`truncate max-w-[140px] ${selected ? 'text-body text-surface-900 dark:text-surface-100' : 'text-body text-surface-300 dark:text-surface-600'}`}>
          {selected?.label || placeholder}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke={isDark ? '#78716C' : '#A8A29E'} strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-surface-900 rounded-card border border-surface-200 dark:border-surface-700 shadow-elevated max-h-60 overflow-auto">
          <div className="px-5 py-4 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between">
            <span className="text-heading text-surface-900 dark:text-surface-100">{label || 'Select'}</span>
            <button onClick={() => setOpen(false)} type="button" className="text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {options.map((item) => (
            <button
              key={item.value}
              className={`px-5 py-4 border-b border-surface-100 dark:border-surface-800 flex items-center justify-between w-full text-left hover:bg-surface-50 dark:hover:bg-surface-800 ${
                item.value === value ? 'bg-brand-50 dark:bg-brand-950' : ''
              }`}
              onClick={() => {
                onChange(item.value);
                setOpen(false);
              }}
              type="button"
            >
              <span className={`text-body ${item.value === value ? 'font-semibold text-brand-600 dark:text-brand-400' : 'text-surface-900 dark:text-surface-100'}`}>
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
