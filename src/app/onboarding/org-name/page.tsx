'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/store/AppContext';
import { Button } from '@/components/ui/Button';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';

export default function OrgNamePage() {
  const router = useRouter();
  const { state, dispatch } = useApp();
  const [name, setName] = useState(state.onboarding.orgName);

  useEffect(() => {
    setName(state.onboarding.orgName);
  }, [state.onboarding.orgName]);

  const next = () => {
    if (!name.trim()) return;
    dispatch({ type: 'SET_ORG_NAME', name: name.trim() });
    router.push('/onboarding/industry');
  };

  return (
    <>
    <OnboardingProgress currentStep={1} role={state.role} />
    <div className="flex-1 px-6 pt-8 pb-8 max-w-lg mx-auto">
      <div className="flex-1">
        <div className="h-12 w-12 rounded-card bg-emerald-600 flex items-center justify-center mb-8">
          <span className="text-white text-xl">O</span>
        </div>
        <h1 className="text-display tracking-tight text-surface-900 dark:text-surface-100 mb-2">Welcome</h1>
        <p className="text-body text-surface-400 dark:text-surface-500 mb-12">Let&apos;s set up your workspace</p>
        <label htmlFor="org-name" className="text-caption font-medium text-surface-500 dark:text-surface-400 mb-2 block">Organization name</label>
        <input
          id="org-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Skyhomes Properties"
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
