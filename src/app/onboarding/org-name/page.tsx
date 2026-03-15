'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/store/AppContext';
import { Button } from '@/components/ui/Button';

export default function OrgNamePage() {
  const router = useRouter();
  const { state, dispatch } = useApp();
  const [name, setName] = useState(state.onboarding.orgName);

  const next = () => {
    if (!name.trim()) return;
    dispatch({ type: 'SET_ORG_NAME', name: name.trim() });
    router.push('/onboarding/industry');
  };

  return (
    <div className="flex-1 px-6 pt-20 pb-8 max-w-lg mx-auto">
      <div className="flex-1">
        <div className="h-12 w-12 rounded-2xl bg-emerald-600 flex items-center justify-center mb-8">
          <span className="text-white text-xl">O</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-2">Welcome</h1>
        <p className="text-base text-gray-400 dark:text-gray-500 mb-12">Let&apos;s set up your workspace</p>
        <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 block">Organization name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Skyhomes Properties"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && next()}
          className="w-full text-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-5 py-4 text-gray-900 dark:text-gray-100 outline-none focus:border-emerald-500"
        />
      </div>
      <div className="mt-8">
        <Button onClick={next} disabled={!name.trim()}>Continue</Button>
      </div>
    </div>
  );
}
