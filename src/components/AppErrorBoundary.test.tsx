/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppErrorBoundary } from './AppErrorBoundary';

// Suppress console.error noise from React and our boundary during tests
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
});

/** Component that throws on render */
function ThrowingChild({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test explosion');
  }
  return <p>Child rendered</p>;
}

describe('AppErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <AppErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </AppErrorBoundary>,
    );

    expect(screen.getByText('Child rendered')).toBeDefined();
  });

  it('catches errors and shows fallback UI', () => {
    render(
      <AppErrorBoundary>
        <ThrowingChild />
      </AppErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeDefined();
    expect(screen.getByRole('button', { name: /reload page/i })).toBeDefined();
  });

  it('calls window.location.reload when retry button is clicked', async () => {
    const user = userEvent.setup();

    // Mock window.location.reload
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: reloadMock },
      writable: true,
    });

    render(
      <AppErrorBoundary>
        <ThrowingChild />
      </AppErrorBoundary>,
    );

    const retryButton = screen.getByRole('button', { name: /reload page/i });
    await user.click(retryButton);

    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});
