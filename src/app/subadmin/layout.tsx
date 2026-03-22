'use client';

import { AppShell } from '@/components/navigation/AppShell';

export default function SubAdminLayout({ children }: { children: React.ReactNode }) {
  return <AppShell appRole="subadmin">{children}</AppShell>;
}
