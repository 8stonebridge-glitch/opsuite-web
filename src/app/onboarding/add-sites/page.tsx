'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import { useApp } from '@/store/AppContext';
import { Button } from '@/components/ui/Button';
import { uid } from '@/utils/id';
import { api } from '@/lib/convexApi';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';

export default function AddSitesPage() {
  const router = useRouter();
  const { state, dispatch } = useApp();
  const [siteName, setSiteName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const createOrg = useMutation(api.organizations.create);
  const createSite = useMutation(api.sites.create);

  const sitesLabel = state.onboarding.industry?.sitesLabel || 'Teams';

  const addSite = () => {
    if (!siteName.trim()) return;
    dispatch({ type: 'ADD_SITE', site: { id: uid(), name: siteName.trim() } });
    setSiteName('');
  };

  const finish = async () => {
    if (isCreating) return;
    setIsCreating(true);

    try {
      // 1. Create the organization in Convex
      const result = await createOrg({
        name: state.onboarding.orgName || 'My Organization',
        industryId: state.onboarding.industry?.id,
        mode: 'managed',
      });

      // 2. Create sites in Convex
      for (const site of state.onboarding.sites) {
        await createSite({ name: site.name });
      }

      // 3. Mark onboarding complete locally
      dispatch({ type: 'FINISH_ONBOARDING' });

      // 4. Navigate to dashboard — ConvexDataBridge will pick up the new org
      router.replace('/admin/overview');
    } catch (err) {
      console.error('Failed to create organization:', err);
      setIsCreating(false);
    }
  };

  return (
    <>
    <OnboardingProgress currentStep={4} />
    <div className="px-6 pt-4 pb-8 max-w-lg mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-1 mb-6 text-caption text-surface-400 dark:text-surface-500 hover:text-surface-600">
        &larr; Back
      </button>
      <div className="flex-1">
        <h1 className="text-display tracking-tight text-surface-900 dark:text-surface-100 mb-2">Add {sitesLabel.toLowerCase()}</h1>
        <p className="text-body text-surface-400 dark:text-surface-500 mb-8">Where does your team work?</p>
        <div className="flex gap-3 mb-5">
          <input
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSite()}
            placeholder="Main Office"
            className="flex-1 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-card px-4 py-3.5 text-body text-surface-900 dark:text-surface-100 outline-none focus:border-emerald-500"
          />
          <button
            onClick={addSite}
            disabled={!siteName.trim()}
            className={`px-5 rounded-card text-white font-medium ${!siteName.trim() ? 'opacity-20' : ''}`}
            style={{ backgroundColor: '#059669' }}
          >
            Add
          </button>
        </div>
        <div className="space-y-2">
          {state.onboarding.sites.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-3.5 px-4 rounded-card bg-white dark:bg-surface-900 border border-surface-100 dark:border-surface-800">
              <span className="text-body font-medium text-surface-900 dark:text-surface-100">{s.name}</span>
              <button onClick={() => dispatch({ type: 'REMOVE_SITE', siteId: s.id })} className="text-surface-300 hover:text-surface-500">
                &times;
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-8">
        <Button
          onClick={finish}
          disabled={isCreating}
        >
          {isCreating ? 'Creating...' : state.onboarding.sites.length > 0 ? `Launch ${state.onboarding.orgName}` : 'Skip for now'}
        </Button>
      </div>
    </div>
    </>
  );
}
