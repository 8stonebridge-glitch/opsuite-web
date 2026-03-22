'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface FreshnessLabelProps {
  /** ISO timestamp of when the data was last fetched/computed */
  lastUpdated: string;
  /** If true, data is from a real-time subscription (always "live") */
  isRealtime?: boolean;
}

function getRelativeTime(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function isStale(isoDate: string): boolean {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  return diffMs > 5 * 60 * 1000; // stale if older than 5 minutes
}

export function FreshnessLabel({ lastUpdated, isRealtime }: FreshnessLabelProps) {
  const [, setTick] = useState(0);

  // Re-render every 30s to keep the relative time fresh
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  if (isRealtime) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Live
      </span>
    );
  }

  const stale = isStale(lastUpdated);
  const relTime = getRelativeTime(lastUpdated);

  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] ${
        stale
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-surface-400 dark:text-surface-500'
      }`}
    >
      <Clock className="size-3" />
      {stale ? `Stale — ${relTime}` : `Updated ${relTime}`}
    </span>
  );
}
