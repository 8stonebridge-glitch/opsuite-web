'use client';

import { useState } from 'react';
import type { AvailabilityRecord, AvailabilityType } from '../../types';
import { useApp } from '../../store/AppContext';
import { useAllEmployees } from '../../store/selectors';
import { useTheme } from '../../providers/ThemeProvider';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';

const TYPE_CONFIG: Record<AvailabilityType, { icon: string; label: string; color: string }> = {
  leave: { icon: 'airplane', label: 'Leave', color: '#3b82f6' },
  sick: { icon: 'medkit', label: 'Sick', color: '#ef4444' },
  off_duty: { icon: 'moon', label: 'Off Duty', color: '#6366f1' },
};

interface AvailabilityRequestCardProps {
  record: AvailabilityRecord;
  approverId: string;
}

export function AvailabilityRequestCard({ record, approverId }: AvailabilityRequestCardProps) {
  const { state, dispatch } = useApp();
  const { isDark } = useTheme();
  const allEmployees = useAllEmployees();
  const [isSubmitting, setIsSubmitting] = useState<'approve' | 'reject' | null>(null);
  const employee = allEmployees.find((e) => e.id === record.memberId);
  const typeConfig = TYPE_CONFIG[record.type];

  const dateRange =
    record.startDate === record.endDate
      ? formatShortDate(record.startDate)
      : `${formatShortDate(record.startDate)} - ${formatShortDate(record.endDate)}`;

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
      <div className="flex items-center gap-3 mb-3">
        <Avatar name={employee?.name || 'Unknown'} color={typeConfig.color} size="sm" />
        <div className="flex-1">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 block">
            {employee?.name || 'Unknown'}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {employee?.teamName || 'Direct report'}
          </span>
        </div>
        <div
          className="px-2.5 py-1 rounded-full flex items-center gap-1"
          style={{ backgroundColor: typeConfig.color + '15' }}
        >
          <span style={{ color: typeConfig.color, fontSize: 12 }}>*</span>
          <span
            className="text-[10px] font-semibold"
            style={{ color: typeConfig.color }}
          >
            {typeConfig.label}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: isDark ? '#6b7280' : '#9ca3af', fontSize: 14 }}>&#x1F4C5;</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">{dateRange}</span>
      </div>

      {record.notes ? (
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-3 line-clamp-2">
          {record.notes}
        </p>
      ) : null}

      <div className="flex gap-2">
        <button
          onClick={() => {
            if (window.confirm('Are you sure you want to approve this leave request?')) {
              void handleApprove();
            }
          }}
          disabled={Boolean(isSubmitting)}
          className="flex-1 py-2.5 rounded-xl text-center bg-green-50 dark:bg-green-950"
        >
          <span className="text-xs font-semibold text-green-600">
            {isSubmitting === 'approve' ? 'Approving...' : 'Approve'}
          </span>
        </button>
        <button
          onClick={() => {
            if (window.confirm('Are you sure you want to reject this leave request?')) {
              void handleReject();
            }
          }}
          disabled={Boolean(isSubmitting)}
          className="flex-1 py-2.5 rounded-xl text-center bg-red-50 dark:bg-red-950"
        >
          <span className="text-xs font-semibold text-red-500">
            {isSubmitting === 'reject' ? 'Rejecting...' : 'Reject'}
          </span>
        </button>
      </div>
    </Card>
  );
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}
