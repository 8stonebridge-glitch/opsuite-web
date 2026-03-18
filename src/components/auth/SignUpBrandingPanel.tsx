'use client';

import { BENEFITS } from './sign-up-constants';

/** Left-side branding panel shown on large screens. */
export default function SignUpBrandingPanel() {
  return (
    <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-col justify-between bg-emerald-600 text-white p-10 relative overflow-hidden">
      <BackgroundCircles />

      <div className="relative z-10">
        <Logo />
        <Headline />
        <BenefitsList />
      </div>

      <p className="relative z-10 text-micro text-emerald-300 mt-8">
        Trusted by teams getting organized from day one
      </p>
    </div>
  );
}

function BackgroundCircles() {
  return (
    <div className="absolute inset-0 opacity-10">
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/20" />
      <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-white/10" />
      <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full bg-white/10" />
    </div>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-3 mb-16">
      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-title">O</div>
      <span className="text-title tracking-tight">OpSuite</span>
    </div>
  );
}

function Headline() {
  return (
    <>
      <h1 className="text-display leading-tight mb-4">
        Set up OpSuite for your <span className="text-emerald-200">organization.</span>
      </h1>
      <p className="text-emerald-100 text-body leading-relaxed mb-12 max-w-sm">
        Create your admin account, launch your workspace, and invite staff once your sites and teams are ready.
      </p>
    </>
  );
}

function BenefitsList() {
  return (
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
  );
}
