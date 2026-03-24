'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { useOrganizationList } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useApp } from '../../store/AppContext';
import { api } from '@/lib/convexApi';
import { INDUSTRIES } from '@/constants/industries';
import { Card, CardContent } from '@/components/ui/Card';
import { Building2, HardHat, Hotel, Cog, Store, Heart, Shield, Sparkles, Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const INDUSTRY_ICONS: Record<string, LucideIcon> = {
  fm: Building2,
  construction: HardHat,
  hospitality: Hotel,
  manufacturing: Cog,
  retail: Store,
  healthcare: Heart,
  security: Shield,
  cleaning: Sparkles,
};

export function OrgSwitcher() {
  const { dispatch } = useApp();
  const router = useRouter();
  const organizations = useQuery(api.organizations.listForViewer, {});
  const { setActive, isLoaded: organizationListLoaded } = useOrganizationList();
  const [switchingWorkspaceId, setSwitchingWorkspaceId] = useState<string | null>(null);

  const workspaces = (organizations ?? []).flatMap((entry) => {
    if (!entry) return [];

    return [{
      id: String(entry.organization._id),
      orgName: entry.organization.name,
      industry: entry.organization.industryId
        ? (INDUSTRIES.find((industry) => industry.id === entry.organization.industryId) ?? null)
        : null,
      clerkOrgId: entry.organization.clerkOrgId ?? null,
      isActive: entry.isActive,
    }];
  });

  const handleSwitch = async (workspaceId: string, clerkOrgId: string | null) => {
    if (!clerkOrgId || switchingWorkspaceId || !organizationListLoaded) return;

    setSwitchingWorkspaceId(workspaceId);
    try {
      await setActive?.({ organization: clerkOrgId });
      dispatch({ type: 'SWITCH_ORGANIZATION', workspaceId });
      router.replace('/admin/overview');
    } catch (error) {
      console.error('Failed to switch organization:', error);
      setSwitchingWorkspaceId(null);
    }
  };

  return (
    <div>
      <span className="block text-caption text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2">
        Organizations ({workspaces.length})
      </span>
      {organizations === undefined ? (
        <p className="text-caption text-surface-500 dark:text-surface-400">
          Loading organizations...
        </p>
      ) : null}
      <div className="flex flex-col gap-2">
        {workspaces.map((ws) => {
          const isActive = ws.isActive;
          const isSwitching = switchingWorkspaceId === ws.id;
          const canSwitch = !!ws.clerkOrgId && organizationListLoaded && !isActive && !isSwitching;
          const color = ws.industry?.color || '#6b7280';
          const IndustryIcon = ws.industry?.id ? INDUSTRY_ICONS[ws.industry.id] : undefined;

          return (
            <button
              key={ws.id}
              onClick={() => void handleSwitch(ws.id, ws.clerkOrgId)}
              className="text-left disabled:cursor-not-allowed disabled:opacity-70"
              disabled={!canSwitch}
              type="button"
            >
              <Card
                className={`${isActive ? 'border-2' : ''}`}
                style={isActive ? { borderColor: color } : undefined}
              >
                <CardContent className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: color + '18' }}
                  >
                    {IndustryIcon ? (
                      <IndustryIcon className="w-5 h-5" style={{ color }} />
                    ) : (
                      <span className="text-lg" style={{ color }}>
                        {(ws.orgName || 'O').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-caption text-surface-900 dark:text-surface-100 line-clamp-2 font-semibold">
                      {ws.orgName}
                    </span>
                    <span className="block text-caption text-surface-400 dark:text-surface-500 line-clamp-2">
                      {ws.industry?.name || 'General'}
                    </span>
                    {isSwitching ? (
                      <span className="block text-caption text-surface-500 dark:text-surface-400">
                        Switching...
                      </span>
                    ) : !ws.clerkOrgId ? (
                      <span className="block text-caption text-amber-600 dark:text-amber-400">
                        Unavailable until linked to Clerk
                      </span>
                    ) : null}
                  </div>
                  {isActive && (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: color }}
                    >
                      <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                    </div>
                  )}
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>
    </div>
  );
}
