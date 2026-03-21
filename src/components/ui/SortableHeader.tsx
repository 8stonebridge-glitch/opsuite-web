'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { TableHead } from '@/components/ui/table';

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  key: string;
  direction: SortDirection;
}

interface SortableHeaderProps {
  /** Visible column label */
  label: string;
  /** Unique key identifying this column for sorting */
  sortKey: string;
  /** Current sort state */
  currentSort: SortState | null;
  /** Callback fired when the header is clicked */
  onSort: (key: string, direction: SortDirection) => void;
  /** Additional className for the th element */
  className?: string;
}

/**
 * Sortable table header cell.
 * Toggles between ascending and descending on click.
 * Includes aria-sort for screen readers.
 */
function SortableHeader({
  label,
  sortKey,
  currentSort,
  onSort,
  className,
}: SortableHeaderProps) {
  const isActive = currentSort?.key === sortKey;
  const direction = isActive ? currentSort.direction : null;

  const ariaSortValue: React.AriaAttributes['aria-sort'] = !isActive
    ? 'none'
    : direction === 'asc'
      ? 'ascending'
      : 'descending';

  const handleClick = () => {
    const nextDirection: SortDirection =
      isActive && direction === 'asc' ? 'desc' : 'asc';
    onSort(sortKey, nextDirection);
  };

  return (
    <TableHead
      aria-sort={ariaSortValue}
      className={cn('cursor-pointer select-none', className)}
      onClick={handleClick}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span aria-hidden="true" className="text-xs leading-none">
          {isActive && direction === 'asc' && '\u25B2'}
          {isActive && direction === 'desc' && '\u25BC'}
          {!isActive && '\u25B4\u25BE'}
        </span>
      </span>
    </TableHead>
  );
}

export { SortableHeader };
