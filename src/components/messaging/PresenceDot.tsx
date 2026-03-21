interface PresenceDotProps {
  isOnline: boolean;
  size?: 'sm' | 'md';
}

export function PresenceDot({ isOnline, size = 'sm' }: PresenceDotProps) {
  const sizeClass = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3';
  return (
    <span
      className={`${sizeClass} rounded-full border-2 border-white dark:border-surface-900 ${
        isOnline ? 'bg-emerald-500' : 'bg-surface-300 dark:bg-surface-600'
      }`}
    />
  );
}
