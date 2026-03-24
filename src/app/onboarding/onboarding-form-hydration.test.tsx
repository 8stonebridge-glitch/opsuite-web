/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import OrgNamePage from './org-name/page';
import AdminNamePage from './admin-name/page';
import { AppContext } from '@/store/AppContext';
import { EMPTY_APP_STATE, type AppAction, type AppState } from '@/store/appReducer';

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
}));

vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, ...props }: React.ComponentProps<'button'>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/onboarding/OnboardingProgress', () => ({
  OnboardingProgress: () => <div data-testid="onboarding-progress" />,
}));

function renderWithState(ui: React.ReactElement, state: AppState) {
  const dispatch = vi.fn<(action: AppAction) => void>();

  return render(
    <AppContext.Provider value={{ state, dispatch }}>
      {ui}
    </AppContext.Provider>,
  );
}

describe('Onboarding form hydration', () => {
  beforeEach(() => {
    cleanup();
    routerMock.push.mockReset();
    routerMock.back.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('updates the organization name input when hydrated onboarding state arrives after mount', async () => {
    const initialState: AppState = {
      ...EMPTY_APP_STATE,
      onboarding: {
        ...EMPTY_APP_STATE.onboarding,
        orgName: '',
      },
    };

    const { rerender } = renderWithState(<OrgNamePage />, initialState);

    const input = screen.getByLabelText('Organization name') as HTMLInputElement;
    expect(input.value).toBe('');

    const hydratedState: AppState = {
      ...initialState,
      onboarding: {
        ...initialState.onboarding,
        orgName: 'Skyhomes Properties',
      },
    };

    rerender(
      <AppContext.Provider value={{ state: hydratedState, dispatch: vi.fn() }}>
        <OrgNamePage />
      </AppContext.Provider>,
    );

    await waitFor(() => {
      expect((screen.getByLabelText('Organization name') as HTMLInputElement).value).toBe('Skyhomes Properties');
    });
  });

  it('updates the admin name input when hydrated onboarding state arrives after mount', async () => {
    const initialState: AppState = {
      ...EMPTY_APP_STATE,
      onboarding: {
        ...EMPTY_APP_STATE.onboarding,
        adminName: '',
      },
    };

    const { rerender } = renderWithState(<AdminNamePage />, initialState);

    const input = screen.getByPlaceholderText('Sunday Agwaze') as HTMLInputElement;
    expect(input.value).toBe('');

    const hydratedState: AppState = {
      ...initialState,
      onboarding: {
        ...initialState.onboarding,
        adminName: 'Sunday Agwaze',
      },
    };

    rerender(
      <AppContext.Provider value={{ state: hydratedState, dispatch: vi.fn() }}>
        <AdminNamePage />
      </AppContext.Provider>,
    );

    await waitFor(() => {
      expect((screen.getByPlaceholderText('Sunday Agwaze') as HTMLInputElement).value).toBe('Sunday Agwaze');
    });
  });
});
