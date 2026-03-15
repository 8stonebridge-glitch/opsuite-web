'use client';

import { ThemeProvider } from '@/providers/ThemeProvider';
import { AppProvider } from '@/store/AppContext';
import { InboxProvider } from '@/components/inbox/InboxProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AppProvider>
        <InboxProvider>
          {children}
        </InboxProvider>
      </AppProvider>
    </ThemeProvider>
  );
}
