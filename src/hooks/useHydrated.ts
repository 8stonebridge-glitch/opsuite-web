import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

/**
 * Returns false during SSR and first client render, true after hydration.
 * Uses useSyncExternalStore to avoid setState-in-effect patterns for
 * SSR/client hydration gating.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
