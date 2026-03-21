'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { OnboardingGuard } from '@/components/auth/OnboardingGuard';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <OnboardingGuard>
        <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
          {children}
        </div>
      </OnboardingGuard>
    </ProtectedRoute>
  );
}
