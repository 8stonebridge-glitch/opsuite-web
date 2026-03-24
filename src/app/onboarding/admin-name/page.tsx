'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/store/AppContext';
import { Button } from '@/components/ui/Button';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';

export default function AdminNamePage() {
  const router = useRouter();
  const { state, dispatch } = useApp();
  const [name, setName] = useState(state.onboarding.adminName);

  useEffect(() => {
    setName(state.onboarding.adminName);
  }, [state.onboarding.adminName]);

  const next = () => {
    if (!name.trim()) return;
    dispatch({ type: 'SET_ADMIN_NAME', name: name.trim() });
    router.push('/onboarding/add-sites');
  };

  return (
    <>
    <OnboardingProgress currentStep={3} role={state.role} />
    <div className="px-6 pt-4 pb-8 max-w-lg mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-1 mb-6 text-caption text-surface-400 dark:text-surface-500 hover:text-surface-600">
        &larr; Back
      </button>
      <div className="flex-1">
        <h1 className="text-display tracking-tight text-surface-900 dark:text-surface-100 mb-12">Your name</h1>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Sunday Agwaze"
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && next()}
          className="w-full text-xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-card px-5 py-4 text-surface-900 dark:text-surface-100 outline-none focus:border-emerald-500"
        />
      </div>
      <div className="mt-8">
        <Button onClick={next} disabled={!name.trim()}>Continue</Button>
      </div>
    </div>
    </>
  );
}
