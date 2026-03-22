'use client';

import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ErrorStateProps {
  error?: Error | string;
  onRetry?: () => void;
  title?: string;
  className?: string;
}

export function ErrorState({
  error,
  onRetry,
  title = 'Something went wrong',
  className = '',
}: ErrorStateProps) {
  const [showDetails, setShowDetails] = useState(false);

  const message =
    typeof error === 'string'
      ? error
      : error?.message ?? 'An unexpected error occurred.';

  const stack =
    typeof error === 'object' && error instanceof Error ? error.stack : null;

  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div
      role="alert"
      className={`rounded-xl border border-surface-100 dark:border-surface-800 border-l-4 border-l-red-500 bg-white dark:bg-surface-900 p-4 text-sm ${className}`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="font-medium text-surface-900 dark:text-surface-100">
            {title}
          </span>
          <span className="text-surface-400 dark:text-surface-500">
            {message}
          </span>

          <div className="flex items-center gap-2 pt-1">
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                Retry
              </Button>
            )}

            {isDev && stack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails((prev) => !prev)}
              >
                Details
                {showDetails ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
          </div>

          {isDev && showDetails && stack && (
            <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-surface-50 dark:bg-surface-800 p-3 font-mono text-xs text-surface-400 dark:text-surface-500">
              {stack}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
