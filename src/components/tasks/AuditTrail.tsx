'use client';

import type { AuditEntry } from '../../types';
import { formatTime, formatHumanDate } from '../../utils/date';

interface AuditTrailProps {
  entries: AuditEntry[];
}

const TYPE_COLORS: Record<string, string> = {
  Assignment: 'bg-blue-400',
  'Progress Update': 'bg-emerald-400',
  Status: 'bg-blue-400',
  Rejection: 'bg-red-400',
  Rework: 'bg-amber-400',
  Escalation: 'bg-red-500',
  Approval: 'bg-emerald-500',
  Verified: 'bg-emerald-600',
  Note: 'bg-surface-400',
  System: 'bg-surface-300',
  Notification: 'bg-blue-300',
  'No Change': 'bg-surface-300',
  'Check-in': 'bg-emerald-300',
  Instruction: 'bg-purple-400',
  Delegated: 'bg-indigo-400',
  'Daily Handoff': 'bg-emerald-400',
  'No Tasks Today': 'bg-surface-400',
};

export function AuditTrail({ entries }: AuditTrailProps) {
  if (entries.length === 0) {
    return (
      <div className="py-8 flex justify-center">
        <span className="text-surface-300 text-body">No activity yet</span>
      </div>
    );
  }

  return (
    <div className="pl-4">
      {entries.map((entry, i) => {
        const dotColor = TYPE_COLORS[entry.updateType] || 'bg-surface-300';
        const isLast = i === entries.length - 1;

        return (
          <div key={entry.id} className="flex">
            <div className="flex flex-col items-center mr-3">
              <div className={`h-2.5 w-2.5 rounded-full mt-1.5 ${dotColor}`} />
              {!isLast && <div className="w-0.5 flex-1 bg-surface-200 mt-1" />}
            </div>
            <div className={`flex-1 ${isLast ? 'pb-2' : 'pb-4'}`}>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-caption text-surface-500">{entry.role}</span>
                <span className="text-caption text-surface-300">{formatHumanDate(entry.dateTag) || entry.dateTag}</span>
                <span className="text-caption text-surface-300">{formatTime(entry.createdAt)}</span>
              </div>
              <span className="text-body text-surface-700 leading-5">{entry.message}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
