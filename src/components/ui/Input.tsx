'use client';

import React from 'react';
import { useTheme } from '../../providers/ThemeProvider';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  containerClassName?: string;
  onChangeText?: (text: string) => void;
}

export function Input({ label, containerClassName = '', className, onChangeText, onChange, ...props }: InputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeText?.(e.target.value);
    onChange?.(e);
  };
  const { isDark } = useTheme();

  return (
    <div className={containerClassName}>
      {label && (
        <span className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
          {label}
        </span>
      )}
      <input
        className={`bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 py-3.5 text-base text-gray-900 dark:text-gray-100 w-full outline-none ${className || ''}`}
        onChange={handleChange}
        {...props}
      />
    </div>
  );
}
