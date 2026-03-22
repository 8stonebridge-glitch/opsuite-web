'use client';

import { AppShell } from '@/components/navigation/AppShell';

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return <AppShell appRole="employee">{children}</AppShell>;
}
