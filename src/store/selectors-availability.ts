'use client';

import { useMemo } from 'react';
import { useApp } from './AppContext';
import {
  isProtectedUnavailable,
  awayTodayForScope,
  pendingAvailabilityRequestsForScope,
  coverageNeededTasksForScope,
} from '../utils/availability-helpers';
import { getToday } from '../utils/date';
import type { AvailabilityRecord, Task, Employee } from '../types';

export function useAvailability(): AvailabilityRecord[] {
  const { state } = useApp();
  return state.availability;
}

export function useIsProtectedUnavailableToday(): boolean {
  const { state } = useApp();
  return useMemo(() => {
    if (!state.userId) return false;
    return isProtectedUnavailable(state.userId, getToday(), state.availability);
  }, [state.userId, state.availability]);
}

export function useAwayToday(): Employee[] {
  const { state } = useApp();
  return useMemo(
    () => awayTodayForScope(state.userId, getToday(), state.availability, state.teams, state.allEmployees, state.role),
    [state.userId, state.availability, state.teams, state.allEmployees, state.role],
  );
}

export function usePendingRequests(): AvailabilityRecord[] {
  const { state } = useApp();
  return useMemo(
    () => pendingAvailabilityRequestsForScope(state.userId, state.availability, state.teams, state.role),
    [state.userId, state.availability, state.teams, state.role],
  );
}

export function useCoverageNeeded(): Task[] {
  const { state } = useApp();
  return useMemo(
    () => coverageNeededTasksForScope(state.userId, getToday(), state.tasks, state.availability, state.teams, state.role),
    [state.userId, state.tasks, state.availability, state.teams, state.role],
  );
}
