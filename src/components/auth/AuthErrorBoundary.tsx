'use client';

/**
 * FEAT-AUTH-13: Unauthorized/forbidden fallback behavior.
 * FEAT-DATA-15: Error states and boundaries for auth flows.
 *
 * Catches auth-specific errors (Unauthenticated, Unauthorized, Forbidden)
 * and renders a targeted recovery UI instead of a generic crash screen.
 */

import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: 'unauthenticated' | 'forbidden' | 'generic' | null;
  errorMessage: string;
}

const AUTH_ERROR_PATTERNS = [
  { pattern: /unauthenticated/i, type: 'unauthenticated' as const },
  { pattern: /unauthorized/i, type: 'unauthenticated' as const },
  { pattern: /not authenticated/i, type: 'unauthenticated' as const },
  { pattern: /forbidden/i, type: 'forbidden' as const },
  { pattern: /do not have access/i, type: 'forbidden' as const },
  { pattern: /only the organization owner/i, type: 'forbidden' as const },
  { pattern: /no active organization/i, type: 'unauthenticated' as const },
  { pattern: /user record not initialized/i, type: 'unauthenticated' as const },
] as const;

function classifyError(error: Error): State['error'] {
  const msg = error.message || '';
  for (const { pattern, type } of AUTH_ERROR_PATTERNS) {
    if (pattern.test(msg)) return type;
  }
  return null;
}

export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State | null {
    const errorType = classifyError(error);
    if (errorType) {
      return { error: errorType, errorMessage: error.message };
    }
    // Not an auth error — let it bubble to the parent boundary
    return null;
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const errorType = classifyError(error);
    if (errorType) {
      console.warn(`[AuthErrorBoundary] ${errorType}:`, error.message, info.componentStack);
    } else {
      // Re-throw non-auth errors so AppErrorBoundary can catch them
      throw error;
    }
  }

  handleSignIn = () => {
    const returnTo = encodeURIComponent(window.location.pathname);
    window.location.assign(`/sign-in?returnTo=${returnTo}`);
  };

  handleGoBack = () => {
    window.history.back();
  };

  handleRetry = () => {
    this.setState({ error: null, errorMessage: '' });
  };

  render() {
    if (this.state.error === 'unauthenticated') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950 px-6">
          <div className="text-center max-w-sm" role="alert">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v.01M12 9v3m0-8a9 9 0 110 18 9 9 0 010-18z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-2">
              Session expired
            </h2>
            <p className="text-sm text-surface-500 dark:text-surface-400 mb-6">
              Your session is no longer active. Please sign in again to continue.
            </p>
            <button
              onClick={this.handleSignIn}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
            >
              Sign in
            </button>
          </div>
        </div>
      );
    }

    if (this.state.error === 'forbidden') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950 px-6">
          <div className="text-center max-w-sm" role="alert">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 11-12.728 0 9 9 0 0112.728 0zM12 9v4m0 4h.01" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-2">
              Access denied
            </h2>
            <p className="text-sm text-surface-500 dark:text-surface-400 mb-6">
              You don&apos;t have permission to access this page. Contact your organization admin if you believe this is an error.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleGoBack}
                className="px-5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 text-sm font-semibold transition-colors hover:bg-surface-100 dark:hover:bg-surface-800"
              >
                Go back
              </button>
              <button
                onClick={this.handleRetry}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
