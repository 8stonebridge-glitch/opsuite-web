'use client';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-surface-200 dark:bg-surface-700 ${className}`}
    />
  );
}

/** Pre-built skeleton card: title line + 2 body lines inside a card shell. */
export function SkeletonCard({ className = '', count: _count }: { className?: string; count?: number }) {
  return (
    <div
      className={`rounded-2xl border border-surface-100 dark:border-surface-800 bg-white dark:bg-surface-900 p-4 space-y-3 ${className}`}
    >
      <Skeleton className="h-5 w-2/5" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}

/** Pre-built skeleton table: header row + 5 body rows. */
export function SkeletonTable({
  rows = 5,
  cols = 4,
  className = '',
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-surface-100 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex gap-4 border-b border-surface-100 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50 px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={`h-${i}`} className="h-4 flex-1" />
        ))}
      </div>
      {/* Body rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex gap-4 border-b border-surface-50 dark:border-surface-800 last:border-b-0 px-4 py-3"
        >
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={`${r}-${c}`} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Pre-built skeleton KPI row: 4 metric cards in a responsive grid. */
export function SkeletonKpi({ className = '' }: { className?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-4 md:grid-cols-4 ${className}`}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-surface-100 dark:border-surface-800 bg-white dark:bg-surface-900 p-4 space-y-2"
        >
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-8 w-3/5" />
          <Skeleton className="h-3 w-2/5" />
        </div>
      ))}
    </div>
  );
}
