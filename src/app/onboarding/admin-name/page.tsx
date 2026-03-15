'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/store/AppContext';
import { Button } from '@/components/ui/Button';

export default function AdminNamePage() {
  const router = useRouter();
  const { state, dispatch } = useApp();
  const [name, setName] = useState(state.onboarding.adminName);

  const next = () => {
    if (!name.trim()) return;
    dispatch({ type: 'SET_ADMIN_NAME', name: name.trim() });
    router.push('/onboarding/add-sites');
  };

  return (
    <div className="px-6 pt-12 pb-8 max-w-lg mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-1 mb-6 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600">
        &larr; Back
      </button>
      <div className="flex-1">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-12">Your name</h1>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Sunday Agwaze"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && next()}
          className="w-full text-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-5 py-4 text-gray-900 dark:text-gray-100 outline-none focus:border-emerald-500"
        />
      </div>
      <div className="mt-8">
        <Button title="Continue" onPress={next} disabled={!name.trim()} />
      </div>
    </div>
  );
}
