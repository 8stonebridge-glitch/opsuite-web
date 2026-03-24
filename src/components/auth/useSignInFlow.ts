'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthActions } from '@convex-dev/auth/react';
import { useConvexAuth } from 'convex/react';
import { useRouter } from 'next/navigation';

// Fallback post-sign-in destination — role routing happens client-side
export const POST_SIGN_IN_URL = '/';

// FEAT-AUTH-08: Resolve post-sign-in URL per-mount so ?returnTo is always
// read from the current URL (module-level caching missed subsequent navigations).
function resolvePostSignInUrl(): string {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const returnTo = params.get('returnTo');
    // Only accept relative paths to prevent open redirect
    if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
      return returnTo;
    }
  }
  return POST_SIGN_IN_URL;
}

export default function useSignInFlow() {
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  // Computed per-mount so ?returnTo is read from the current URL each time
  // the sign-in page renders, not frozen at module load time.
  const postSignInUrl = useMemo(() => resolvePostSignInUrl(), []);
  // Prevents the isAuthenticated useEffect from racing with successful sign-in navigation
  const didFinalize = useRef(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'password'>('email');

  // Only redirect here for users who were already signed in when the page loaded.
  useEffect(() => {
    if (!isLoading && isAuthenticated && !didFinalize.current) {
      router.replace(postSignInUrl);
    }
  }, [isLoading, isAuthenticated, router, postSignInUrl]);

  const handleGoogle = useCallback(async () => {
    try {
      await signIn('google');
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    }
  }, [signIn]);

  // FEAT-TIMING-01: Debounce — prevent double-submit
  const submittingRef = useRef(false);

  const handleEmailSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email.trim()) return;
      if (submittingRef.current) return;
      setError('');
      setStep('password');
    },
    [email],
  );

  const handlePasswordSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!password) return;
      // FEAT-TIMING-01: Debounce — prevent double-submit
      if (submittingRef.current) return;
      submittingRef.current = true;
      setError('');
      setLoading(true);
      try {
        await signIn('password', { email: email.trim(), password });
        didFinalize.current = true;
        router.replace(postSignInUrl);
      } catch (err: any) {
        setError(err.message || 'Invalid email or password');
      } finally {
        setLoading(false);
        submittingRef.current = false;
      }
    },
    [signIn, email, password, router, postSignInUrl],
  );

  return {
    isLoaded: !isLoading,
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    error,
    setError,
    loading,
    step,
    setStep,
    needsClientTrust: false,
    verificationTarget: email,
    verificationCode: '',
    setVerificationCode: () => {},
    resetCode: '',
    setResetCode: () => {},
    newPassword: '',
    setNewPassword: () => {},
    handleGoogle,
    handleEmailSubmit,
    handlePasswordSubmit,
    handleClientTrustVerify: async (e: React.FormEvent) => {
      e.preventDefault();
    },
    handleForgotPassword: async () => {},
    handleResetPassword: async (e: React.FormEvent) => {
      e.preventDefault();
    },
  };
}
