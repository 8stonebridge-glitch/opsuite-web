'use client';

import { ThemeProvider } from '@/providers/ThemeProvider';
import { SessionProvider } from '@/providers/SessionProvider';
import { AppProvider } from '@/store/AppContext';
import { InboxProvider } from '@/components/inbox/InboxProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SessionProvider>
        <AppProvider>
          <InboxProvider>
            {children}
          </InboxProvider>
        </AppProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
