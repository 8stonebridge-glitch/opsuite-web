'use client';

import { AppShell } from '@/components/navigation/AppShell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AppShell appRole="owner_admin">{children}</AppShell>;
}
