'use client';

import { useEffect } from 'react';

/**
 * Global error boundary — catches errors in the root layout itself.
 * Must render its own <html> and <body> since the root layout is unavailable.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="antialiased bg-white text-gray-900">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold">
              Something went wrong
            </h2>
            <p className="text-sm text-gray-500">
              A critical error occurred. This can sometimes be caused by browser extensions.
            </p>
            <button
              onClick={reset}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
