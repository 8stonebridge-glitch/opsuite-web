'use client';

import Link from 'next/link';

import SignInBrandingPanel from '@/components/auth/SignInBrandingPanel';
import GoogleSSOButton from '@/components/auth/GoogleSSOButton';
import EmailStepForm from '@/components/auth/EmailStepForm';
import PasswordStepForm from '@/components/auth/PasswordStepForm';
import VerificationStepForm from '@/components/auth/VerificationStepForm';
import useSignInFlow from '@/components/auth/useSignInFlow';

function MobileLogo() {
  return (
    <div className="lg:hidden flex items-center gap-2.5 mb-10">
      <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white text-caption font-bold">O</div>
      <span className="text-title text-surface-900 dark:text-surface-100 tracking-tight">OpSuite</span>
    </div>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-surface-200 dark:bg-surface-800" />
      <span className="text-micro text-surface-400 dark:text-surface-500 font-medium">or</span>
      <div className="flex-1 h-px bg-surface-200 dark:bg-surface-800" />
    </div>
  );
}

export default function SignInPage() {
  const flow = useSignInFlow();

  if (!flow.isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-50 dark:bg-surface-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-surface-200 border-t-emerald-600 dark:border-surface-700 dark:border-t-emerald-400" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <SignInBrandingPanel />
      <div className="flex-1 flex flex-col items-center justify-center bg-surface-50 dark:bg-surface-950 px-6 py-12">
        <MobileLogo />
        <div className="w-full max-w-[380px]">
          <h2 className="text-title text-surface-900 dark:text-surface-100 mb-1.5">Welcome back</h2>
          <p className="text-caption text-surface-500 dark:text-surface-400 mb-8">
            Sign in with the credentials your admin gave you, or use your admin account to manage your organization.
          </p>
          <GoogleSSOButton onClick={flow.handleGoogle} />
          <Divider />
          <SignInFormStep {...flow} />
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

function SignInFormStep(flow: ReturnType<typeof useSignInFlow>) {
  if (flow.step === 'email') {
    return (
      <EmailStepForm
        email={flow.email}
        setEmail={flow.setEmail}
        error={flow.error}
        loading={flow.loading}
        onSubmit={flow.handleEmailSubmit}
      />
    );
  }

  if (flow.needsClientTrust) {
    return (
      <VerificationStepForm
        verificationTarget={flow.verificationTarget}
        verificationCode={flow.verificationCode}
        setVerificationCode={flow.setVerificationCode}
        error={flow.error}
        loading={flow.loading}
        onBack={() => { flow.setStep('password'); flow.setVerificationCode(''); flow.setError(''); }}
        onSubmit={flow.handleClientTrustVerify}
      />
    );
  }

  return (
    <PasswordStepForm
      email={flow.email}
      password={flow.password}
      setPassword={flow.setPassword}
      showPassword={flow.showPassword}
      setShowPassword={flow.setShowPassword}
      error={flow.error}
      loading={flow.loading}
      onBack={() => { flow.setStep('email'); flow.setPassword(''); flow.setError(''); }}
      onSubmit={flow.handlePasswordSubmit}
    />
  );
}
