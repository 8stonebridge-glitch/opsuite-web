import { SignUp } from '@clerk/nextjs';
import { Zap, BarChart3, Bell } from 'lucide-react';

const BENEFITS = [
  { icon: Zap, text: 'Get started in under 2 minutes' },
  { icon: BarChart3, text: 'Real-time dashboards and analytics' },
  { icon: Bell, text: 'Instant notifications and alerts' },
];

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left branding panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-col justify-between bg-emerald-600 text-white p-10 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/20" />
          <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-white/10" />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full bg-white/10" />
        </div>

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-lg font-bold">
              O
            </div>
            <span className="text-xl font-bold tracking-tight">OpSuite</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl xl:text-4xl font-bold leading-tight mb-4">
            Start managing your operations{' '}
            <span className="text-emerald-200">today.</span>
          </h1>
          <p className="text-emerald-100 text-base leading-relaxed mb-12 max-w-sm">
            Create your free account and set up your organization in minutes. No credit card required.
          </p>

          {/* Benefits */}
          <div className="space-y-4">
            {BENEFITS.map((b) => (
              <div key={b.text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                  <b.icon className="w-4 h-4 text-emerald-100" />
                </div>
                <p className="text-sm font-medium text-emerald-50">{b.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-xs text-emerald-300 mt-8">
          Join operations teams who trust OpSuite
        </p>
      </div>

      {/* Right sign-up panel */}
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-6 py-12">
        {/* Mobile logo — shown only on small screens */}
        <div className="lg:hidden flex items-center gap-2.5 mb-10">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white text-sm font-bold">
            O
          </div>
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">OpSuite</span>
        </div>

        <SignUp
          forceRedirectUrl="/admin/overview"
          appearance={{
            elements: {
              rootBox: 'w-full max-w-[400px]',
              card: 'shadow-none border border-gray-200 dark:border-gray-800 rounded-2xl',
              headerTitle: 'text-xl font-bold text-gray-900 dark:text-gray-100',
              headerSubtitle: 'text-sm text-gray-500 dark:text-gray-400',
              socialButtonsBlockButton: 'rounded-xl border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800',
              formFieldInput: 'rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900',
              formButtonPrimary: 'rounded-xl bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold',
              footerActionLink: 'text-emerald-600 hover:text-emerald-700 font-semibold',
            },
          }}
        />

        <p className="mt-8 text-xs text-gray-400 dark:text-gray-500 text-center max-w-xs">
          By continuing, you agree to OpSuite&apos;s Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
