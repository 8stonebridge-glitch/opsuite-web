'use client';

/**
 * FEAT-AUTH-08: Session expiry handling with graceful warning and returnTo preservation.
 * FEAT-TIMING-03: Session timeout warning timing and auto-logout countdown.
 *
 * Monitors Clerk session state. When the session expires or becomes invalid:
 * 1. Shows a non-blocking warning banner
 * 2. Preserves the current URL as returnTo
 * 3. After a countdown, redirects to sign-in with returnTo param
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';

const WARNING_SECONDS = 30;
const CHECK_INTERVAL_MS = 10_000; // check every 10s

export function SessionExpiryGuard() {
  const { isSignedIn, isLoaded } = useAuth();
  const pathname = usePathname();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(WARNING_SECONDS);
  const wasSignedIn = useRef(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Track if the user was previously signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      wasSignedIn.current = true;
    }
  }, [isLoaded, isSignedIn]);

  // Detect session loss (was signed in, now isn't)
  // setState is deferred via setTimeout to satisfy react-hooks/set-state-in-effect
  useEffect(() => {
    if (!isLoaded) return;

    // Skip on public pages
    if (pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up')) return;

    if (wasSignedIn.current && isSignedIn === false) {
      const id = setTimeout(() => {
        setShowWarning(true);
        setCountdown(WARNING_SECONDS);
      }, 0);
      return () => clearTimeout(id);
    }
  }, [isLoaded, isSignedIn, pathname]);

  // Countdown timer
  useEffect(() => {
    if (!showWarning) return;

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Time's up — redirect with returnTo
          const returnTo = encodeURIComponent(pathname);
          window.location.assign(`/sign-in?returnTo=${returnTo}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [showWarning, pathname]);

  const handleSignInNow = useCallback(() => {
    const returnTo = encodeURIComponent(pathname);
    window.location.assign(`/sign-in?returnTo=${returnTo}`);
  }, [pathname]);

  const handleDismiss = useCallback(() => {
    setShowWarning(false);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  if (!showWarning) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-0 left-0 right-0 z-[9999] bg-amber-50 dark:bg-amber-950 border-b border-amber-200 dark:border-amber-800 px-4 py-3"
    >
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Your session has expired.
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
            Redirecting to sign-in in {countdown}s. Your current page will be preserved.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSignInNow}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors"
          >
            Sign in now
          </button>
          <button
            onClick={handleDismiss}
            className="px-2 py-1.5 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 transition-colors"
            aria-label="Dismiss session warning"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
