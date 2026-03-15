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
      {icon || <FolderOpen className="h-10 w-10 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />}
      <span className="text-gray-400 dark:text-gray-500 text-sm mt-3 font-medium">{title}</span>
      {subtitle && <span className="text-gray-300 dark:text-gray-600 text-xs mt-1">{subtitle}</span>}
    </div>
  );
}
