'use client';

interface DividerProps {
  label?: string;
  className?: string;
}

export function Divider({ label, className = '' }: DividerProps) {
  if (label) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex-1 h-px bg-surface-200 dark:bg-surface-700" />
        <span className="text-caption text-surface-400 dark:text-surface-500 font-medium">{label}</span>
        <div className="flex-1 h-px bg-surface-200 dark:bg-surface-700" />
      </div>
    );
  }

  return <div className={`h-px bg-surface-200 dark:bg-surface-700 ${className}`} />;
}
