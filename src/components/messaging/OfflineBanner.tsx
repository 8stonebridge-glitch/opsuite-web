'use client';

import { WifiOff } from 'lucide-react';

interface OfflineBannerProps {
  isOffline: boolean;
}

export function OfflineBanner({ isOffline }: OfflineBannerProps) {
  if (!isOffline) return null;

  return (
    <div role="alert" className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-[13px]">
      <WifiOff className="h-3.5 w-3.5" />
      <span>You&apos;re offline. Messages will be sent when you reconnect.</span>
    </div>
  );
}
