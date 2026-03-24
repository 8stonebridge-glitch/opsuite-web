'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuthActions } from '@convex-dev/auth/react';
import { useConvexAuth } from 'convex/react';
import { useRouter } from 'next/navigation';
import { POST_SIGN_UP_URL } from './sign-up-constants';

export function useSignUpHandlers() {
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  // Prevents the isAuthenticated useEffect from racing with successful sign-up navigation
  const didFinalize = useRef(false);

  // Redirect already-signed-in users away from sign-up.
  useEffect(() => {
    if (!isLoading && isAuthenticated && !didFinalize.current) {
      router.replace(POST_SIGN_UP_URL);
    }
  }, [isLoading, isAuthenticated, router]);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  const handleGoogle = async () => {
    try {
      await signIn('google');
    } catch (err: any) {
      setError(err.message || 'Google sign-up failed');
    }
  };

  // FEAT-TIMING-01: Debounce — prevent double-submit
  const submittingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError('');
    setLoading(true);

    try {
      const name = `${firstName.trim()} ${lastName.trim()}`.trim();
      await signIn('password', {
        email: email.trim(),
        password,
        name,
        flow: 'signUp',
      });
      didFinalize.current = true;
      router.replace(POST_SIGN_UP_URL);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    // Convex Auth handles verification internally; this is a no-op stub
  };

  return {
    isLoaded: !isLoading,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    error,
    loading,
    pendingVerification,
    verificationCode,
    setVerificationCode,
    handleGoogle,
    handleSubmit,
    handleVerify,
  };
}
