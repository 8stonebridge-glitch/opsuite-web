'use client';

import { useEffect } from 'react';

/**
 * Removes the CSS-only #initial-loader from layout.tsx once
 * React has hydrated and the app is interactive.
 */
export function InitialLoaderDismiss() {
  useEffect(() => {
    document.getElementById('initial-loader')?.remove();
  }, []);

  return null;
}
