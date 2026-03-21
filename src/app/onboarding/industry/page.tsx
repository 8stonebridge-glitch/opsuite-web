'use client';

import { useRouter } from 'next/navigation';
import { useApp } from '@/store/AppContext';
import { INDUSTRIES } from '@/constants/industries';
import { Button } from '@/components/ui/Button';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';

export default function IndustryPage() {
  const router = useRouter();
  const { state, dispatch } = useApp();

  const select = (ind: (typeof INDUSTRIES)[0]) => {
    dispatch({ type: 'SET_INDUSTRY', industry: ind });
  };

  const next = () => {
    if (!state.onboarding.industry) return;
    router.push('/onboarding/admin-name');
  };

  return (
    <>
    <OnboardingProgress currentStep={2} />
    <div className="px-6 pt-4 pb-8 max-w-lg mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-1 mb-6 text-caption text-surface-400 dark:text-surface-500 hover:text-surface-600">
        &larr; Back
      </button>
      <h1 className="text-display tracking-tight text-surface-900 dark:text-surface-100 mb-2">Your industry</h1>
      <p className="text-body text-surface-400 dark:text-surface-500 mb-8">This loads the right categories</p>
      <div className="grid grid-cols-2 gap-3">
        {INDUSTRIES.map((ind) => (
          <button
            key={ind.id}
            onClick={() => select(ind)}
            className={`p-4 rounded-card border-2 text-left ${
              state.onboarding.industry?.id === ind.id
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950'
                : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900'
            }`}
          >
            <div className="h-8 w-8 rounded-xl mb-3 flex items-center justify-center" style={{ backgroundColor: `${ind.color}18` }}>
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: ind.color }} />
            </div>
            <span className="text-caption text-surface-900 dark:text-surface-100">{ind.name}</span>
          </button>
        ))}
      </div>
      <div className="mt-8">
        <Button onClick={next} disabled={!state.onboarding.industry}>Continue</Button>
      </div>
    </div>
    </>
  );
}
