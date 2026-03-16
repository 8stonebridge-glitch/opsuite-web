'use client';

import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { useAuth } from '@clerk/nextjs';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { SessionProvider } from '@/providers/SessionProvider';
import { AppProvider } from '@/store/AppContext';
import { InboxProvider } from '@/components/inbox/InboxProvider';
import { ConvexDataBridge } from '@/components/ConvexDataBridge';
import { convex } from '@/lib/convex';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <ThemeProvider>
        <SessionProvider>
          <AppProvider>
            <ConvexDataBridge />
            <InboxProvider>
              {children}
            </InboxProvider>
          </AppProvider>
        </SessionProvider>
      </ThemeProvider>
    </ConvexProviderWithClerk>
  );
}
