'use client';

import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { useAuth } from '@clerk/nextjs';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { SessionProvider } from '@/providers/SessionProvider';
import { AppProvider } from '@/store/AppContext';
import { ConvexDataBridge } from '@/components/ConvexDataBridge';
import { InitialLoaderDismiss } from '@/components/InitialLoaderDismiss';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { AuthErrorBoundary } from '@/components/auth/AuthErrorBoundary';
import { SessionExpiryGuard } from '@/components/auth/SessionExpiryGuard';
import { RoleRouterBridge } from '@/components/auth/RoleRouterBridge';
import { convex } from '@/lib/convex';

const isE2E = process.env.NEXT_PUBLIC_PLAYWRIGHT_TEST === '1';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <ThemeProvider>
        <AppErrorBoundary>
          <AuthErrorBoundary>
            <AppProvider>
              <SessionProvider>
                <InitialLoaderDismiss />
                <SessionExpiryGuard />
                <ConvexDataBridge />
                <RoleRouterBridge />
                {isE2E && <E2EBridge />}
                {children}
              </SessionProvider>
            </AppProvider>
          </AuthErrorBoundary>
        </AppErrorBoundary>
      </ThemeProvider>
    </ConvexProviderWithClerk>
  );
}

/** Lazy-loaded only in E2E test runs */
function E2EBridge() {
  // Dynamic require avoids bundling E2EDataBridge in production
  const { E2EDataBridge } = require('@/components/E2EDataBridge');
  return <E2EDataBridge />;
}
