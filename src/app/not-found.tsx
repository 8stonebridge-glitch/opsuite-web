'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-50 dark:bg-surface-950">
      <div className="text-center px-6">
        <h1 className="text-6xl font-bold text-surface-300 dark:text-surface-700 mb-4">404</h1>
        <p className="text-title text-surface-900 dark:text-surface-100 mb-2">
          Page not found
        </p>
        <p className="text-caption text-surface-400 dark:text-surface-500 mb-8">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-xl bg-emerald-600 text-white text-caption font-semibold hover:bg-emerald-700 transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
