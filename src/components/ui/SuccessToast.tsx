'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface SuccessToastProps {
  message: string;
  undoAction?: () => void;
  undoTimeoutMs?: number;
  onDismiss: () => void;
  className?: string;
}

export function SuccessToast({
  message,
  undoAction,
  undoTimeoutMs = 5000,
  onDismiss,
  className = '',
}: SuccessToastProps) {
  const [remaining, setRemaining] = useState(undoTimeoutMs);

  // Auto-dismiss after timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, undoTimeoutMs);
    return () => clearTimeout(timer);
  }, [onDismiss, undoTimeoutMs]);

  // Countdown progress
  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 50;
        return next <= 0 ? 0 : next;
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const progress = remaining / undoTimeoutMs;

  return (
    <div
      role="status"
      className={`fixed bottom-6 left-1/2 z-50 w-auto min-w-72 max-w-md -translate-x-1/2 overflow-hidden rounded-xl border border-surface-100 dark:border-surface-800 border-l-4 border-l-green-500 bg-white dark:bg-surface-900 text-sm shadow-lg ${className}`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
        <span className="flex-1 text-surface-900 dark:text-surface-100">
          {message}
        </span>

        <div className="flex shrink-0 items-center gap-1">
          {undoAction && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                undoAction();
                onDismiss();
              }}
            >
              Undo
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onDismiss}
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Countdown progress bar */}
      <div className="h-0.5 w-full bg-surface-100 dark:bg-surface-800">
        <div
          className="h-full bg-green-500 transition-[width] duration-75 ease-linear"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
