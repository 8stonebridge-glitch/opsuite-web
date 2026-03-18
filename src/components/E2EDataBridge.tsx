'use client';

import { useEffect } from 'react';
import { useApp } from '@/store/AppContext';
import type { Employee } from '@/types';

type E2EStatePayload = {
  orgName: string;
  orgMode: 'managed' | 'direct';
  viewerName?: string;
  settings: {
    noChangeAlertWorkdays: number;
    reworkAlertCycles: number;
  } | null;
  sites: { id: string; name: string }[];
  standaloneEmployees: Employee[];
};

export function E2EDataBridge() {
  const { dispatch } = useApp();

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_PLAYWRIGHT_TEST !== '1') {
      return;
    }

    let cancelled = false;

    void fetch('/api/e2e/state')
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok || cancelled || !data?.state) {
          return;
        }

        const state = data.state as E2EStatePayload;
        dispatch({ type: 'SET_ORG_NAME', name: state.orgName });
        dispatch({ type: 'SET_ORG_MODE', mode: state.orgMode });
        dispatch({ type: 'FINISH_ONBOARDING' });

        if (state.viewerName) {
          dispatch({ type: 'SET_ADMIN_NAME', name: state.viewerName });
        }

        if (state.settings) {
          dispatch({
            type: 'SET_ORG_SETTINGS',
            settings: state.settings,
          });
        }

        dispatch({
          type: 'SYNC_CONVEX_DATA',
          teams: [],
          sites: state.sites,
          standaloneEmployees: state.standaloneEmployees,
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  return null;
}
