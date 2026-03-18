'use client';

import Link from 'next/link';

import SignUpBrandingPanel from '@/components/auth/SignUpBrandingPanel';
import SignUpForm from '@/components/auth/SignUpForm';
import VerificationForm from '@/components/auth/VerificationForm';
import { useSignUpHandlers } from '@/components/auth/useSignUpHandlers';

export default function SignUpPage() {
  const s = useSignUpHandlers();

  if (!s.isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-50 dark:bg-surface-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-surface-200 border-t-emerald-600 dark:border-surface-700 dark:border-t-emerald-400" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <SignUpBrandingPanel />

      <div className="flex-1 flex flex-col items-center justify-center bg-surface-50 dark:bg-surface-950 px-6 py-12">
        <MobileLogo />

        <div className="w-full max-w-[380px]">
          {!s.pendingVerification ? (
            <SignUpForm
              firstName={s.firstName}
              lastName={s.lastName}
              email={s.email}
              password={s.password}
              showPassword={s.showPassword}
              loading={s.loading}
              error={s.error}
              onFirstNameChange={s.setFirstName}
              onLastNameChange={s.setLastName}
              onEmailChange={s.setEmail}
              onPasswordChange={s.setPassword}
              onTogglePassword={() => s.setShowPassword(!s.showPassword)}
              onSubmit={s.handleSubmit}
              onGoogle={s.handleGoogle}
            />
          ) : (
            <VerificationForm
              email={s.email}
              verificationCode={s.verificationCode}
              loading={s.loading}
              error={s.error}
              onCodeChange={s.setVerificationCode}
              onSubmit={s.handleVerify}
            />
          )}

          <SignInLink />
        </div>

        {/* Clerk bot protection CAPTCHA — required when Smart CAPTCHA is enabled */}
        <div id="clerk-captcha" className="mt-4" />

        <TermsFooter />
      </div>
    </div>
  );
}

function MobileLogo() {
  return (
    <div className="lg:hidden flex items-center gap-2.5 mb-10">
      <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white text-caption font-bold">O</div>
      <span className="text-title text-surface-900 dark:text-surface-100 tracking-tight">OpSuite</span>
    </div>
  );
}

function SignInLink() {
  return (
    <p className="text-center text-caption text-surface-500 dark:text-surface-400 mt-8">
      Already have an admin or staff account?{' '}
      <Link href="/sign-in" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold">
        Sign in
      </Link>
    </p>
  );
}

function TermsFooter() {
  return (
    <p className="mt-10 text-micro text-surface-400 dark:text-surface-600 text-center max-w-xs">
      By continuing, you agree to OpSuite&apos;s Terms of Service and Privacy Policy.
    </p>
  );
}
