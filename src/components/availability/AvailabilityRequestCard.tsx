'use client';

import { useState } from 'react';
import type { AvailabilityRecord, AvailabilityType } from '../../types';
import { useApp } from '../../store/AppContext';
import { useAllEmployees } from '../../store/selectors';
import { Card, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '../ui/Avatar';
import {
  Plane,
  Thermometer,
  Moon,
  Calendar,
  Check,
  X,
  type LucideIcon,
} from 'lucide-react';

const TYPE_CONFIG: Record<
  AvailabilityType,
  { Icon: LucideIcon; label: string; color: string; bg: string; darkBg: string }
> = {
  leave: {
    Icon: Plane,
    label: 'Leave',
    color: '#3b82f6',
    bg: 'bg-blue-50',
    darkBg: 'dark:bg-blue-950',
  },
  sick: {
    Icon: Thermometer,
    label: 'Sick',
    color: '#ef4444',
    bg: 'bg-red-50',
    darkBg: 'dark:bg-red-950',
  },
  off_duty: {
    Icon: Moon,
    label: 'Off Duty',
    color: '#6366f1',
    bg: 'bg-indigo-50',
    darkBg: 'dark:bg-indigo-950',
  },
};

interface AvailabilityRequestCardProps {
  record: AvailabilityRecord;
  approverId: string;
}

export function AvailabilityRequestCard({ record, approverId }: AvailabilityRequestCardProps) {
  const { dispatch } = useApp();
  const allEmployees = useAllEmployees();
  const [isSubmitting, setIsSubmitting] = useState<'approve' | 'reject' | null>(null);
  const employee = allEmployees.find((e) => e.id === record.memberId);
  const config = TYPE_CONFIG[record.type];

  const dateRange =
    record.startDate === record.endDate
      ? formatShortDate(record.startDate)
      : `${formatShortDate(record.startDate)} \u2013 ${formatShortDate(record.endDate)}`;

  // Calculate day count
  const start = new Date(record.startDate + 'T00:00:00');
  const end = new Date(record.endDate + 'T00:00:00');
  const dayCount = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;

  const handleApprove = async () => {
    setIsSubmitting('approve');
    try {
      dispatch({
        type: 'APPROVE_AVAILABILITY',
        recordId: record.id,
        approvedById: approverId,
      });
    } finally {
      setIsSubmitting(null);
    }
  };

  const handleReject = async () => {
    setIsSubmitting('reject');
    try {
      dispatch({
        type: 'REJECT_AVAILABILITY',
        recordId: record.id,
        approvedById: approverId,
      });
    } finally {
      setIsSubmitting(null);
    }
  };

  return (
    <Card>
      <CardContent className="py-0">
        {/* Type icon + person info */}
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${config.bg} ${config.darkBg}`}
          >
            <config.Icon className="size-[18px]" style={{ color: config.color }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground truncate">
                {employee?.name || 'Unknown'}
              </span>
              <span
                className="shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ backgroundColor: config.color + '14', color: config.color }}
              >
                {config.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {employee?.teamName || 'Direct report'}
            </p>
          </div>
        </div>

        {/* Date range + day count */}
        <div className="flex items-center gap-4 mt-3 pl-[52px]">
          <div className="flex items-center gap-1.5">
            <Calendar className="size-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">{dateRange}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {dayCount} {dayCount === 1 ? 'day' : 'days'}
          </span>
        </div>

        {/* Notes */}
        {record.notes && (
          <p className="text-xs text-muted-foreground mt-2 pl-[52px] line-clamp-2 leading-relaxed">
            &ldquo;{record.notes}&rdquo;
          </p>
        )}
      </CardContent>

      {/* Action buttons in card footer */}
      <CardFooter className="gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-800 dark:hover:bg-emerald-950"
          onClick={() => {
            if (window.confirm('Approve this request?')) {
              void handleApprove();
            }
          }}
          disabled={Boolean(isSubmitting)}
        >
          <Check data-icon="inline-start" className="size-3.5" />
          {isSubmitting === 'approve' ? 'Approving...' : 'Approve'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-red-800 dark:hover:bg-red-950"
          onClick={() => {
            if (window.confirm('Reject this request?')) {
              void handleReject();
            }
          }}
          disabled={Boolean(isSubmitting)}
        >
          <X data-icon="inline-start" className="size-3.5" />
          {isSubmitting === 'reject' ? 'Rejecting...' : 'Decline'}
        </Button>
      </CardFooter>
    </Card>
  );
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}
