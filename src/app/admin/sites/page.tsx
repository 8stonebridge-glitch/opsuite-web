'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/store/AppContext';
import { api } from '@/lib/convexApi';
import { useSiteHealth, useIndustryColor, useSitesLabel } from '@/store/selectors';
import { HealthCard } from '@/components/overview/HealthCard';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/providers/ThemeProvider';

export default function SitesScreen() {
  const { state } = useApp();
  const createSite = useMutation(api.sites.create);
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
      setSiteError('Enter a team name with at least 2 characters.');
      return;
    }

    setSiteError('');
    setIsSavingSite(true);

    try {
      await createSite({ name: trimmedName, code: trimmedCode || undefined });
      setSiteName('');
      setSiteCode('');
      setShowCreateSite(false);
    } catch (error) {
      setSiteError(error instanceof Error ? error.message : 'We could not create that team yet.');
    } finally {
      setIsSavingSite(false);
    }
  };

  return (
    <div className="flex-1 bg-surface-50 dark:bg-surface-950 min-h-screen">
      <div className="overflow-y-auto">
        <div className="px-5 pt-4 pb-24">
          <div className="flex items-center justify-between mb-3 gap-3">
            <p className="text-caption text-surface-400 dark:text-surface-500 uppercase tracking-wider flex-1">
              {label}
            </p>
            <button
              onClick={() => setShowCreateSite(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700"
            >
              <span style={{ color }} className="text-sm">+</span>
              <span className="text-caption" style={{ color }}>
                Add Team
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
              <p className="text-body text-surface-400 dark:text-surface-500">No {label.toLowerCase()} configured</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Site Modal */}
      {showCreateSite && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="fixed inset-0 bg-black/30" onClick={() => setShowCreateSite(false)} />
          <div className="relative bg-white dark:bg-surface-950 rounded-t-3xl md:rounded-3xl px-5 pt-5 pb-10 w-full md:max-w-lg">
            <div className="flex items-center justify-between mb-5">
              <p className="text-heading text-surface-900 dark:text-surface-100">Add Team</p>
              <button onClick={() => setShowCreateSite(false)} className="text-surface-500 text-xl">&times;</button>
            </div>

            <p className="text-caption text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2">
              Team Name
            </p>
            <input
              className="w-full bg-surface-50 dark:bg-surface-900 rounded-card px-4 py-3.5 text-body text-surface-900 dark:text-surface-100 mb-4 outline-none"
              placeholder="Victoria Hub"
              value={siteName}
              onChange={(e) => {
                setSiteName(e.target.value);
                setSiteError('');
              }}
            />

            <p className="text-caption text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2">
              Team Code (optional)
            </p>
            <input
              className="w-full bg-surface-50 dark:bg-surface-900 rounded-card px-4 py-3.5 text-body text-surface-900 dark:text-surface-100 mb-4 outline-none uppercase"
              placeholder="VIC-HUB"
              value={siteCode}
              onChange={(e) => {
                setSiteCode(e.target.value);
                setSiteError('');
              }}
            />

            <p className="text-body text-surface-400 dark:text-surface-500 leading-6 mb-5">
              New teams will appear across the owner overview, team health cards, and future task assignment flows.
            </p>

            {siteError ? (
              <p className="text-body text-red-600 mb-4">{siteError}</p>
            ) : null}

            <Button
              onClick={() => void handleCreateSite()}
              disabled={isSavingSite}
              style={{ backgroundColor: color }}
            >{isSavingSite ? 'Creating team...' : 'Create Team'}</Button>
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
