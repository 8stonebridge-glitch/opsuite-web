'use client';

import { useEffect, useRef, useState } from 'react';
import { useSignUp, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { POST_SIGN_UP_URL } from './sign-up-constants';

export function useSignUpHandlers() {
  const { fetchStatus, signUp } = useSignUp();
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  // Prevents the isSignedIn useEffect from racing with finalizeSignUp's navigate
  const didFinalize = useRef(false);

  // Redirect already-signed-in users away from sign-up.
  // After an active sign-up, finalizeSignUp sets didFinalize so this is skipped.
  useEffect(() => {
    if (isLoaded && isSignedIn && !didFinalize.current) {
      router.replace(POST_SIGN_UP_URL);
    }
  }, [isLoaded, isSignedIn, router]);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  const finalizeSignUp = async () => {
    if (!signUp) return;

    // Mark before navigation so the isSignedIn useEffect skips its redirect
    didFinalize.current = true;
    const { error: finalizeError } = await signUp.finalize({
      navigate: async ({ decorateUrl }) => {
        const targetUrl = decorateUrl(POST_SIGN_UP_URL);

        if (/^https?:\/\//.test(targetUrl)) {
          window.location.assign(targetUrl);
          return;
        }

        router.replace(targetUrl);
      },
    });

    if (finalizeError) {
      didFinalize.current = false; // Reset so future attempts work
      setError(finalizeError.message || 'Unable to finish signing up');
    }
  };

  const handleGoogle = async () => {
    if (!signUp) return;
    try {
      const { error } = await signUp.sso({
        strategy: 'oauth_google',
        redirectUrl: '/sign-up/sso-callback',
        redirectCallbackUrl: POST_SIGN_UP_URL,
      });
      if (error) setError(error.message || 'Google sign-up failed');
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || err.message || 'Google sign-up failed');
    }
  };

  // FEAT-TIMING-01: Debounce — prevent double-submit
  const submittingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUp) return;
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError('');
    setLoading(true);

    try {
      const { error } = await signUp.password({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        emailAddress: email.trim(),
        password,
      });

      if (error) {
        setError(error.message || 'Something went wrong');
        setLoading(false);
        return;
      }

      const verifyResult = await signUp.verifications.sendEmailCode();
      if (verifyResult.error) {
        setError(verifyResult.error.message || 'Failed to send verification code');
      } else {
        setPendingVerification(true);
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || err.message || 'Something went wrong');
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUp) return;
    setError('');
    setLoading(true);

    try {
      const { error } = await signUp.verifications.verifyEmailCode({ code: verificationCode });

      if (error) {
        setError(error.message || 'Invalid verification code');
      } else if (signUp.status === 'complete') {
        await finalizeSignUp();
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  return {
    isLoaded: fetchStatus === 'idle' && isLoaded,
    firstName, setFirstName,
    lastName, setLastName,
    email, setEmail,
    password, setPassword,
    showPassword, setShowPassword,
    error,
    loading,
    pendingVerification,
    verificationCode, setVerificationCode,
    handleGoogle,
    handleSubmit,
    handleVerify,
  };
}
