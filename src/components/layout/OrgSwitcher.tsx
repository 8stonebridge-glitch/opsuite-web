'use client';

import { useRouter } from 'next/navigation';
import { useApp } from '../../store/AppContext';
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
  const { state, dispatch } = useApp();
  const router = useRouter();

  const handleSwitch = (workspaceId: string) => {
    if (workspaceId === state.activeWorkspaceId) return;
    dispatch({ type: 'SWITCH_ORGANIZATION', workspaceId });
    router.replace('/admin/overview');
  };

  return (
    <div>
      <span className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
        Organizations ({state.workspaces.length})
      </span>
      <div className="flex flex-col gap-2">
        {state.workspaces.map((ws) => {
          const isActive = ws.id === state.activeWorkspaceId;
          const color = ws.industry?.color || '#6b7280';
          const IndustryIcon = ws.industry?.id ? INDUSTRY_ICONS[ws.industry.id] : undefined;

          return (
            <button key={ws.id} onClick={() => void handleSwitch(ws.id)} className="text-left" type="button">
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
                    <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
                      {ws.orgName}
                    </span>
                    <span className="block text-xs text-gray-400 dark:text-gray-500 line-clamp-2">
                      {ws.industry?.name || 'General'}
                    </span>
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
