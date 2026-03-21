'use client';

/**
 * Skip-to-main-content link for keyboard accessibility.
 * Visually hidden until focused via Tab key.
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:rounded-lg focus:bg-emerald-600 focus:px-4 focus:py-2 focus:text-white focus:text-sm focus:font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
    >
      Skip to main content
    </a>
  );
}
