'use client';

import type { Role } from '@/types';

// ── Step definitions per role ──────────────────────────────────────

interface StepDef {
  label: string;
  estimate: string; // e.g. "~1 min"
}

const STEPS_BY_ROLE: Record<Role, StepDef[]> = {
  admin: [
    { label: 'Organization Name', estimate: '~1 min' },
    { label: 'Industry', estimate: '~1 min' },
    { label: 'Your Name', estimate: '~30 sec' },
    { label: 'Add Sites', estimate: '~2 min' },
  ],
  subadmin: [
    { label: 'Your Name', estimate: '~30 sec' },
    { label: 'Industry', estimate: '~1 min' },
  ],
  employee: [
    { label: 'Your Name', estimate: '~30 sec' },
  ],
};

interface OnboardingProgressProps {
  currentStep: number; // 1-based
  role?: Role;
}

export function OnboardingProgress({ currentStep, role = 'admin' }: OnboardingProgressProps) {
  const steps = STEPS_BY_ROLE[role];

  return (
    <div className="w-full max-w-lg mx-auto px-6 pt-8 pb-2">
      <div className="flex items-center gap-0">
        {steps.map((step, idx) => {
          const stepNum = idx + 1;
          const isCompleted = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;

          return (
            <div key={step.label} className="flex items-center flex-1 last:flex-none">
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                        ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 dark:ring-emerald-900'
                        : 'bg-surface-200 dark:bg-surface-700 text-surface-400 dark:text-surface-500'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    stepNum
                  )}
                </div>
                <span
                  className={`text-[10px] mt-1.5 whitespace-nowrap hidden sm:block ${
                    isCurrent
                      ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                      : isCompleted
                        ? 'text-surface-500 dark:text-surface-400'
                        : 'text-surface-300 dark:text-surface-600'
                  }`}
                >
                  {step.label}
                </span>
                {/* Time estimate — desktop only */}
                <span className="text-[9px] mt-0.5 whitespace-nowrap hidden sm:block text-surface-300 dark:text-surface-600">
                  {step.estimate}
                </span>
              </div>

              {/* Connector line */}
              {stepNum < steps.length && (
                <div className="flex-1 mx-2">
                  <div
                    className={`h-0.5 w-full rounded transition-colors ${
                      isCompleted
                        ? 'bg-emerald-500'
                        : 'bg-surface-200 dark:bg-surface-700'
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
