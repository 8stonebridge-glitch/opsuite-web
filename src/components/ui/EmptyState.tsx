'use client';

import { FolderOpen } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  return (
    <div className="py-16 flex flex-col items-center">
      {icon || <FolderOpen className="h-10 w-10 text-surface-300 dark:text-surface-600" strokeWidth={1.5} />}
      <span className="text-surface-400 dark:text-surface-500 text-body mt-3 font-medium">{title}</span>
      {subtitle && <span className="text-surface-300 dark:text-surface-600 text-caption mt-1">{subtitle}</span>}
    </div>
  );
}
