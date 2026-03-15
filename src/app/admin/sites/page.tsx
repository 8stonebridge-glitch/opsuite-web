'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../../../../src/store/AppContext';
import { useSiteHealth, useIndustryColor, useSitesLabel } from '../../../../src/store/selectors';
import { RoleSwitcher } from '../../../../src/components/layout/RoleSwitcher';
import { HealthCard } from '../../../../src/components/overview/HealthCard';
import { Button } from '@/components/ui/Button';
import { useTheme } from '../../../../src/providers/ThemeProvider';
import { uid } from '../../../../src/utils/id';

export default function SitesScreen() {
  const { state, dispatch } = useApp();
  const color = useIndustryColor();
  const { isDark } = useTheme();
  const label = useSitesLabel();
  const router = useRouter();
  const [showCreateSite, setShowCreateSite] = useState(false);
  const [siteName, setSiteName] = useState('');
  const [siteCode, setSiteCode] = useState('');
  const [siteError, setSiteError] = useState('');
  const [isSavingSite, setIsSavingSite] = useState(false);

  const handleCreateSite = async () => {
    const trimmedName = siteName.trim();
    const trimmedCode = siteCode.trim();

    if (trimmedName.length < 2) {
      setSiteError('Enter a site name with at least 2 characters.');
      return;
    }

    setSiteError('');
    setIsSavingSite(true);

    try {
      dispatch({
        type: 'ADD_SITE',
        site: {
          id: uid(),
          name: trimmedName,
        },
      });

      setSiteName('');
      setSiteCode('');
      setShowCreateSite(false);
    } catch (error) {
      setSiteError(error instanceof Error ? error.message : 'We could not create that site yet.');
    } finally {
      setIsSavingSite(false);
    }
  };

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-950 min-h-screen">
      <RoleSwitcher />

      <div className="overflow-y-auto">
        <div className="px-5 pt-4 pb-24">
          <div className="flex items-center justify-between mb-3 gap-3">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex-1">
              {label}
            </p>
            <button
              onClick={() => setShowCreateSite(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
            >
              <span style={{ color }} className="text-sm">+</span>
              <span className="text-xs font-semibold" style={{ color }}>
                Add Site
              </span>
            </button>
          </div>
          <div className="space-y-3">
            {state.onboarding.sites.map((site) => (
              <SiteCard
                key={site.id}
                siteId={site.id}
                siteName={site.name}
                onPress={() => router.push(`/admin/sites/${site.id}`)}
              />
            ))}
          </div>

          {state.onboarding.sites.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-gray-400 dark:text-gray-500">No {label.toLowerCase()} configured</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Site Modal */}
      {showCreateSite && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="fixed inset-0 bg-black/30" onClick={() => setShowCreateSite(false)} />
          <div className="relative bg-white dark:bg-gray-950 rounded-t-3xl md:rounded-3xl px-5 pt-5 pb-10 w-full md:max-w-lg">
            <div className="flex items-center justify-between mb-5">
              <p className="text-base font-bold text-gray-900 dark:text-gray-100">Add Site</p>
              <button onClick={() => setShowCreateSite(false)} className="text-gray-500 text-xl">&times;</button>
            </div>

            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              Site Name
            </p>
            <input
              className="w-full bg-gray-50 dark:bg-gray-900 rounded-2xl px-4 py-3.5 text-base text-gray-900 dark:text-gray-100 mb-4 outline-none"
              placeholder="Victoria Hub"
              value={siteName}
              onChange={(e) => {
                setSiteName(e.target.value);
                setSiteError('');
              }}
            />

            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              Site Code (optional)
            </p>
            <input
              className="w-full bg-gray-50 dark:bg-gray-900 rounded-2xl px-4 py-3.5 text-base text-gray-900 dark:text-gray-100 mb-4 outline-none uppercase"
              placeholder="VIC-HUB"
              value={siteCode}
              onChange={(e) => {
                setSiteCode(e.target.value);
                setSiteError('');
              }}
            />

            <p className="text-sm text-gray-400 dark:text-gray-500 leading-6 mb-5">
              New sites will appear across the owner overview, site health cards, and future task assignment flows.
            </p>

            {siteError ? (
              <p className="text-sm text-red-600 mb-4">{siteError}</p>
            ) : null}

            <Button
              onClick={() => void handleCreateSite()}
              disabled={isSavingSite}
              style={{ backgroundColor: color }}
            >{isSavingSite ? 'Creating site...' : 'Create Site'}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SiteCard({
  siteId,
  siteName,
  onPress,
}: {
  siteId: string;
  siteName: string;
  onPress: () => void;
}) {
  const health = useSiteHealth(siteId);
  return (
    <HealthCard
      title={siteName}
      icon="location"
      iconColor="#6366f1"
      onPress={onPress}
      stats={[
        { label: 'Active', value: health.totalActive, color: '#3b82f6' },
        { label: 'Overdue', value: health.overdue, color: '#dc2626' },
        { label: 'Review', value: health.review, color: '#d97706' },
        { label: 'Check-in', value: `${health.checkInRate}%`, color: '#059669' },
      ]}
    />
  );
}
