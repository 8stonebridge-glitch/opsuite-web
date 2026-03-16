'use client';

interface ProgressBarProps {
  value: number;
  color?: string;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({ value, color = '#059669', size = 'md', showLabel = false, className = '' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const height = size === 'sm' ? 'h-1.5' : 'h-2.5';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex-1 ${height} rounded-pill bg-surface-100 dark:bg-surface-800 overflow-hidden`}>
        <div
          className={`${height} rounded-pill transition-all duration-300 ease-out`}
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </div>
      {showLabel && (
        <span className="text-caption font-medium text-surface-500 dark:text-surface-400 tabular-nums">
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
}
