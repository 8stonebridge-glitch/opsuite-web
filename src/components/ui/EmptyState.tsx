'use client';

import type { ReactNode } from 'react';
import { Inbox, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface EmptyStateProps {
  icon?: LucideIcon | ReactNode;
  title: string;
  description?: string;
  /** Alias for description (backward compat). */
  subtitle?: string;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  className?: string;
}

function isLucideIcon(icon: unknown): icon is LucideIcon {
  return typeof icon === 'function';
}

export function EmptyState({
  icon,
  title,
  description,
  subtitle,
  action,
  secondaryAction,
  className = '',
}: EmptyStateProps) {
  const desc = description || subtitle;

  const renderIcon = () => {
    if (!icon) {
      return <Inbox className="h-6 w-6 text-surface-400 dark:text-surface-500" />;
    }
    if (isLucideIcon(icon)) {
      const Icon = icon;
      return <Icon className="h-6 w-6 text-surface-400 dark:text-surface-500" />;
    }
    // ReactNode fallback (backward compat for string/JSX)
    return icon;
  };

  return (
    <div
      className={`py-16 flex flex-col items-center justify-center text-center px-4 gap-4 ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-100 dark:bg-surface-800">
        {renderIcon()}
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-base font-medium text-surface-900 dark:text-surface-100">
          {title}
        </span>
        {desc && (
          <span className="text-sm text-surface-400 dark:text-surface-500 max-w-sm">
            {desc}
          </span>
        )}
      </div>

      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 pt-1">
          {action && (
            <Button size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="ghost" size="sm" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
