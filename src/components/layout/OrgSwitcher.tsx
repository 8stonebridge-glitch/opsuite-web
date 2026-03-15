'use client';

import { useRouter } from 'next/navigation';
import { useApp } from '../../store/AppContext';
import { Card } from '../ui/Card';

const INDUSTRY_ICONS: Record<string, string> = {
  fm: 'business',
  construction: 'construct',
  hospitality: 'bed',
  manufacturing: 'cog',
  retail: 'storefront',
  healthcare: 'medkit',
  security: 'shield-checkmark',
  cleaning: 'sparkles',
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

          return (
            <button key={ws.id} onClick={() => void handleSwitch(ws.id)} className="text-left" type="button">
              <Card
                className={`flex items-center gap-3 ${
                  isActive ? 'border-2' : ''
                }`}
                style={isActive ? { borderColor: color } : undefined}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                  style={{ backgroundColor: color + '18' }}
                >
                  <span style={{ color }}>
                    {(ws.orgName || 'O').charAt(0).toUpperCase()}
                  </span>
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
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </Card>
            </button>
          );
        })}
      </div>
    </div>
  );
}
