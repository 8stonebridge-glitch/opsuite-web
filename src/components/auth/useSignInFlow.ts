'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSignIn, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

const POST_SIGN_IN_URL =
  process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL ||
  process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL ||
  process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL ||
  '/admin/overview';

export { POST_SIGN_IN_URL };

function useFinalizeSignIn(
  signIn: ReturnType<typeof useSignIn>['signIn'],
  router: ReturnType<typeof useRouter>,
  setError: (msg: string) => void,
) {
  return useCallback(async () => {
    if (!signIn) return;
    const { error: finalizeError } = await signIn.finalize({
      navigate: async ({ decorateUrl }) => {
        const targetUrl = decorateUrl(POST_SIGN_IN_URL);
        if (/^https?:\/\//.test(targetUrl)) {
          window.location.assign(targetUrl);
          return;
        }
        router.replace(targetUrl);
      },
    });
    if (finalizeError) {
      setError(finalizeError.message || 'Unable to finish signing in');
    }
  }, [router, signIn, setError]);
}

function useTransferFlow(
  signIn: ReturnType<typeof useSignIn>['signIn'],
  finalizeSignIn: () => Promise<void>,
  setError: (msg: string) => void,
  setLoading: (v: boolean) => void,
) {
  const transferAttempted = useRef(false);

  useEffect(() => {
    if (!signIn || transferAttempted.current) return;
    const handleTransfer = async () => {
      if (!signIn.isTransferable) return;
      transferAttempted.current = true;
      setError('');
      setLoading(true);
      try {
        const { error: transferError } = await signIn.create({ transfer: true });
        if (transferError) {
          setError(transferError.message || 'We could not finish signing you in.');
          transferAttempted.current = false;
          return;
        }
        if (signIn.status === 'complete') {
          await finalizeSignIn();
          return;
        }
        transferAttempted.current = false;
      } catch (err: any) {
        setError(err.errors?.[0]?.longMessage || err.message || 'We could not finish signing you in.');
        transferAttempted.current = false;
      } finally {
        setLoading(false);
      }
    };
    void handleTransfer();
  }, [finalizeSignIn, signIn, setError, setLoading]);
}

function useGoogleSSO(
  signIn: ReturnType<typeof useSignIn>['signIn'],
  setError: (msg: string) => void,
) {
  return useCallback(async () => {
    if (!signIn) return;
    try {
      const { error } = await signIn.sso({
        strategy: 'oauth_google',
        redirectUrl: '/sign-in/sso-callback',
        redirectCallbackUrl: POST_SIGN_IN_URL,
      });
      if (error) setError(error.message || 'Google sign-in failed');
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || err.message || 'Google sign-in failed');
    }
  }, [signIn, setError]);
}

function useEmailSubmit(
  signIn: ReturnType<typeof useSignIn>['signIn'],
  email: string,
  setError: (msg: string) => void,
  setLoading: (v: boolean) => void,
  setStep: (s: 'email' | 'password') => void,
) {
  return useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signIn || !email.trim()) return;
    setError('');
    setLoading(true);
    try {
      const { error } = await signIn.create({ identifier: email.trim() });
      if (error) {
        setError(error.message || 'We could not continue with that email address.');
        return;
      }
      setStep('password');
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || err.message || 'We could not continue with that email address.');
    } finally {
      setLoading(false);
    }
  }, [signIn, email, setError, setLoading, setStep]);
}

function usePasswordSubmit(
  signIn: ReturnType<typeof useSignIn>['signIn'],
  password: string,
  setError: (msg: string) => void,
  setLoading: (v: boolean) => void,
  setVerificationCode: (v: string) => void,
  finalizeSignIn: () => Promise<void>,
) {
  return useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signIn || !password) return;
    setError('');
    setLoading(true);
    try {
      const { error } = await signIn.password({ password });
      if (error) {
        setError(error.message || 'Invalid password');
      } else if (signIn.status === 'complete') {
        await finalizeSignIn();
      } else if (signIn.status === 'needs_client_trust') {
        const { error: sendError } = await signIn.mfa.sendEmailCode();
        if (sendError) {
          setError(sendError.message || 'We could not send your verification code.');
        } else {
          setVerificationCode('');
        }
      } else {
        setError('Additional verification is required to finish signing in.');
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || err.message || 'Invalid password');
    } finally {
      setLoading(false);
    }
  }, [signIn, password, setError, setLoading, setVerificationCode, finalizeSignIn]);
}

function useClientTrustVerify(
  signIn: ReturnType<typeof useSignIn>['signIn'],
  verificationCode: string,
  setError: (msg: string) => void,
  setLoading: (v: boolean) => void,
  finalizeSignIn: () => Promise<void>,
) {
  return useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signIn || !verificationCode.trim()) return;
    setError('');
    setLoading(true);
    try {
      const { error } = await signIn.mfa.verifyEmailCode({ code: verificationCode.trim() });
      if (error) {
        setError(error.message || 'Invalid verification code');
      } else if (signIn.status === 'complete') {
        await finalizeSignIn();
      } else {
        setError('We still need a little more verification to finish signing you in.');
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  }, [signIn, verificationCode, setError, setLoading, finalizeSignIn]);
}

export default function useSignInFlow() {
  const { fetchStatus, signIn } = useSignIn();
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'password'>('email');

  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace(POST_SIGN_IN_URL);
  }, [isLoaded, isSignedIn, router]);

  const finalizeSignIn = useFinalizeSignIn(signIn, router, setError);
  useTransferFlow(signIn, finalizeSignIn, setError, setLoading);

  const clientTrustFactor = signIn?.supportedSecondFactors?.find(
    (factor) => factor.strategy === 'email_code',
  );
  const verificationTarget =
    clientTrustFactor && 'safeIdentifier' in clientTrustFactor
      ? clientTrustFactor.safeIdentifier
      : email;

  return {
    isLoaded: fetchStatus === 'idle' && isLoaded,
    email, setEmail,
    password, setPassword,
    verificationCode, setVerificationCode,
    showPassword, setShowPassword,
    error, setError,
    loading,
    step, setStep,
    needsClientTrust: signIn?.status === 'needs_client_trust',
    verificationTarget: verificationTarget as string,
    handleGoogle: useGoogleSSO(signIn, setError),
    handleEmailSubmit: useEmailSubmit(signIn, email, setError, setLoading, setStep),
    handlePasswordSubmit: usePasswordSubmit(signIn, password, setError, setLoading, setVerificationCode, finalizeSignIn),
    handleClientTrustVerify: useClientTrustVerify(signIn, verificationCode, setError, setLoading, finalizeSignIn),
  };
}
