'use client';

import { useState } from 'react';
import { useSignUp } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, BarChart3, Bell, Eye, EyeOff, Loader2 } from 'lucide-react';

const BENEFITS = [
  { icon: Zap, text: 'Set up your admin workspace in minutes' },
  { icon: BarChart3, text: 'Configure sites, teams, and reporting from day one' },
  { icon: Bell, text: 'Create staff accounts later from the People page' },
];

const POST_SIGN_UP_URL =
  process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL ||
  process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL ||
  process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL ||
  '/admin/overview';

export default function SignUpPage() {
  const { signUp } = useSignUp();
  const router = useRouter();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUp) return;
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

      // Send email verification code
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
            Set up OpSuite for your{' '}
            <span className="text-emerald-200">organization.</span>
          </h1>
          <p className="text-emerald-100 text-body leading-relaxed mb-12 max-w-sm">
            Create your admin account, launch your workspace, and invite staff once your sites and teams are ready.
          </p>

          <div className="space-y-4">
            {BENEFITS.map((b) => (
              <div key={b.text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                  <b.icon className="w-4 h-4 text-emerald-100" />
                </div>
                <p className="text-caption font-medium text-emerald-50">{b.text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-micro text-emerald-300 mt-8">
          Trusted by teams getting organized from day one
        </p>
      </div>

      {/* Right sign-up panel */}
      <div className="flex-1 flex flex-col items-center justify-center bg-surface-50 dark:bg-surface-950 px-6 py-12">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-10">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white text-caption font-bold">O</div>
          <span className="text-title text-surface-900 dark:text-surface-100 tracking-tight">OpSuite</span>
        </div>

        <div className="w-full max-w-[380px]">
          {!pendingVerification ? (
            <>
              <h2 className="text-title text-surface-900 dark:text-surface-100 mb-1.5">Create admin account</h2>
              <p className="text-caption text-surface-500 dark:text-surface-400 mb-8">
                For organization owners setting up OpSuite. Staff accounts are created later by an admin.
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
                Continue with Google as admin
              </button>

              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-surface-200 dark:bg-surface-800" />
                <span className="text-micro text-surface-400 dark:text-surface-500 font-medium">or</span>
                <div className="flex-1 h-px bg-surface-200 dark:bg-surface-800" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="firstName" className="block text-caption font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                      First name
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                      autoComplete="given-name"
                      autoFocus
                      required
                      className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-caption text-surface-900 dark:text-surface-100 placeholder-surface-400 dark:placeholder-surface-500 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-caption font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                      Last name
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      autoComplete="family-name"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-caption text-surface-900 dark:text-surface-100 placeholder-surface-400 dark:placeholder-surface-500 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>

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
                    required
                    className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-caption text-surface-900 dark:text-surface-100 placeholder-surface-400 dark:placeholder-surface-500 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                  />
                </div>

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
                      placeholder="Create a password"
                      autoComplete="new-password"
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
                  disabled={loading || !email.trim() || !password || !firstName.trim() || !lastName.trim()}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-caption font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create admin account
                </button>
              </form>

              <p className="text-micro text-surface-400 dark:text-surface-500 leading-relaxed">
                Employees and subadmins should use the main sign-in page with the email and password provided by their admin.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-title text-surface-900 dark:text-surface-100 mb-1.5">Verify your email</h2>
              <p className="text-caption text-surface-500 dark:text-surface-400 mb-8">
                We sent an admin verification code to{' '}
                <span className="font-medium text-surface-700 dark:text-surface-300">{email}</span>
              </p>

              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label htmlFor="code" className="block text-caption font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                    Verification code
                  </label>
                  <input
                    id="code"
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="Enter 6-digit code"
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
                  disabled={loading || !verificationCode}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-caption font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Verify & continue
                </button>
              </form>
            </>
          )}

          <p className="text-center text-caption text-surface-500 dark:text-surface-400 mt-8">
            Already have an admin or staff account?{' '}
            <Link href="/sign-in" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold">
              Sign in
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
