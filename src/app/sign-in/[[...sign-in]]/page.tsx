'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSignIn } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ClipboardList, Users, MapPin, Shield, Eye, EyeOff, Loader2 } from 'lucide-react';

const FEATURES = [
  { icon: ClipboardList, label: 'Task Management', desc: 'Create, assign, and track tasks across your organization' },
  { icon: Users, label: 'Team Coordination', desc: 'Manage teams, roles, and accountability chains' },
  { icon: MapPin, label: 'Multi-Site Operations', desc: 'Oversee work across all your locations in one place' },
  { icon: Shield, label: 'Real-Time Visibility', desc: 'Live dashboards, audit trails, and performance insights' },
];

const POST_SIGN_IN_URL =
  process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL ||
  process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL ||
  process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL ||
  '/admin/overview';

export default function SignInPage() {
  const { signIn } = useSignIn();
  const router = useRouter();
  const transferAttempted = useRef(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'password'>('email');
  const clientTrustFactor = signIn?.supportedSecondFactors?.find((factor) => factor.strategy === 'email_code');
  const verificationTarget =
    clientTrustFactor && 'safeIdentifier' in clientTrustFactor
      ? clientTrustFactor.safeIdentifier
      : email;

  const finalizeSignIn = useCallback(async () => {
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
  }, [router, signIn]);

  useEffect(() => {
    if (!signIn || transferAttempted.current) {
      return;
    }

    const handleTransfer = async () => {
      if (!signIn.isTransferable) {
        return;
      }

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
  }, [finalizeSignIn, signIn]);

  const handleGoogle = async () => {
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
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signIn || !email.trim()) return;
    setError('');
    setLoading(true);

    try {
      const { error } = await signIn.create({
        identifier: email.trim(),
      });

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
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signIn || !email.trim() || !password) return;
    setError('');
    setLoading(true);

    try {
      const { error } = await signIn.password({
        password,
      });

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
  };

  const handleClientTrustVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signIn || !verificationCode.trim()) return;
    setError('');
    setLoading(true);

    try {
      const { error } = await signIn.mfa.verifyEmailCode({
        code: verificationCode.trim(),
      });

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
  };

  return (
    <div className="flex min-h-screen">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-col justify-between bg-emerald-600 text-white p-10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/20" />
          <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-white/10" />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full bg-white/10" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-title">O</div>
            <span className="text-title tracking-tight">OpSuite</span>
          </div>

          <h1 className="text-display leading-tight mb-4">
            Operations management,{' '}
            <span className="text-emerald-200">simplified.</span>
          </h1>
          <p className="text-emerald-100 text-body leading-relaxed mb-12 max-w-sm">
            Streamline your field operations with real-time task tracking, team management, and performance insights.
          </p>

          <div className="space-y-5">
            {FEATURES.map((f) => (
              <div key={f.label} className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0 mt-0.5">
                  <f.icon className="w-[18px] h-[18px] text-emerald-100" />
                </div>
                <div>
                  <p className="text-caption font-semibold">{f.label}</p>
                  <p className="text-micro text-emerald-200 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-micro text-emerald-300 mt-8">
          Trusted by operations teams across industries
        </p>
      </div>

      {/* Right sign-in panel */}
      <div className="flex-1 flex flex-col items-center justify-center bg-surface-50 dark:bg-surface-950 px-6 py-12">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-10">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white text-caption font-bold">O</div>
          <span className="text-title text-surface-900 dark:text-surface-100 tracking-tight">OpSuite</span>
        </div>

        <div className="w-full max-w-[380px]">
          <h2 className="text-title text-surface-900 dark:text-surface-100 mb-1.5">Welcome back</h2>
          <p className="text-caption text-surface-500 dark:text-surface-400 mb-8">
            Sign in with the credentials your admin gave you, or use your admin account to manage your organization.
          </p>

          {/* Google */}
          <button
            onClick={handleGoogle}
            type="button"
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-caption font-medium text-surface-700 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-surface-200 dark:bg-surface-800" />
            <span className="text-micro text-surface-400 dark:text-surface-500 font-medium">or</span>
            <div className="flex-1 h-px bg-surface-200 dark:bg-surface-800" />
          </div>

          {/* Email / Password form */}
          {step === 'email' ? (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-caption font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  autoFocus
                  required
                  className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-caption text-surface-900 dark:text-surface-100 placeholder-surface-400 dark:placeholder-surface-500 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                />
              </div>

              {error && (
                <p className="text-caption text-red-500 dark:text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-caption font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Continue
              </button>
            </form>
          ) : signIn?.status === 'needs_client_trust' ? (
            <form onSubmit={handleClientTrustVerify} className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  setStep('password');
                  setVerificationCode('');
                  setError('');
                }}
                className="text-caption text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 mb-1 flex items-center gap-1"
              >
                &larr; Back
              </button>

              <div>
                <h3 className="text-caption font-semibold text-surface-900 dark:text-surface-100 mb-1.5">
                  Verify this sign-in
                </h3>
                <p className="text-caption text-surface-500 dark:text-surface-400">
                  Enter the code sent to{' '}
                  <span className="font-medium text-surface-700 dark:text-surface-300">{verificationTarget}</span>
                  {' '}to finish signing in.
                </p>
              </div>

              <div>
                <label htmlFor="verificationCode" className="block text-caption font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                  Verification code
                </label>
                <input
                  id="verificationCode"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter code"
                  autoComplete="one-time-code"
                  autoFocus
                  required
                  className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-caption text-surface-900 dark:text-surface-100 placeholder-surface-400 dark:placeholder-surface-500 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors text-center tracking-[0.3em] text-lg font-mono"
                />
              </div>

              {error && (
                <p className="text-caption text-red-500 dark:text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !verificationCode.trim()}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-caption font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Verify & continue
              </button>
            </form>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <button
                type="button"
                onClick={() => { setStep('email'); setPassword(''); setError(''); }}
                className="text-caption text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 mb-1 flex items-center gap-1"
              >
                &larr; {email}
              </button>

              <div>
                <label htmlFor="password" className="block text-caption font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    autoFocus
                    required
                    className="w-full px-4 py-3 pr-11 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-caption text-surface-900 dark:text-surface-100 placeholder-surface-400 dark:placeholder-surface-500 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-caption text-red-500 dark:text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !password}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-caption font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Sign in
              </button>
            </form>
          )}

          <p className="text-center text-caption text-surface-500 dark:text-surface-400 mt-8">
            Setting up OpSuite for your organization?{' '}
            <Link href="/sign-up" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold">
              Create admin account
            </Link>
          </p>
        </div>

        <p className="mt-10 text-micro text-surface-400 dark:text-surface-600 text-center max-w-xs">
          By continuing, you agree to OpSuite&apos;s Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
