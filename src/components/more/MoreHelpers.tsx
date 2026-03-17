'use client';

import React from 'react';

/* ─── Section Label ─── */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-caption text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2 px-1">
      {children}
    </p>
  );
}

/* ─── Setting Row ─── */
export function SettingRow({
  icon,
  label,
  value,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex gap-3 py-3.5 items-center ${last ? '' : 'border-b border-surface-100 dark:border-surface-800'}`}
    >
      <div className="shrink-0">{icon}</div>
      <span className="text-body text-surface-700 dark:text-surface-300 flex-1 pr-2 min-w-0">
        {label}
      </span>
      <span className="text-body text-surface-400 dark:text-surface-500 text-right max-w-[46%] shrink truncate">
        {value}
      </span>
    </div>
  );
}

/* ─── Stepper Row ─── */
export function StepperRow({
  icon,
  label,
  value,
  unit,
  onMinus,
  onPlus,
  color,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  unit: string;
  onMinus: () => void;
  onPlus: () => void;
  color: string;
  last?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 py-3.5 ${last ? '' : 'border-b border-surface-100 dark:border-surface-800'}`}>
      <div className="shrink-0" style={{ color }}>{icon}</div>
      <span className="text-body text-surface-700 dark:text-surface-300 flex-1 min-w-0 truncate">{label}</span>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onMinus}
          className="w-9 h-9 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-surface-500 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors text-body"
        >
          -
        </button>
        <span className="text-body font-semibold text-surface-900 dark:text-surface-100 min-w-[3rem] text-center">
          {value}{unit === 'workdays' ? 'd' : unit === 'cycles' ? 'x' : unit}
        </span>
        <button
          onClick={onPlus}
          className="w-9 h-9 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-surface-500 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors text-body"
        >
          +
        </button>
      </div>
    </div>
  );
}
