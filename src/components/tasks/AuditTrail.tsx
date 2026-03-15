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
  Note: 'bg-gray-400',
  System: 'bg-gray-300',
  Notification: 'bg-blue-300',
  'No Change': 'bg-gray-300',
  'Check-in': 'bg-emerald-300',
  Instruction: 'bg-purple-400',
  Delegated: 'bg-indigo-400',
  'Daily Handoff': 'bg-emerald-400',
  'No Tasks Today': 'bg-gray-400',
};

export function AuditTrail({ entries }: AuditTrailProps) {
  if (entries.length === 0) {
    return (
      <div className="py-8 flex justify-center">
        <span className="text-gray-300 text-sm">No activity yet</span>
      </div>
    );
  }

  return (
    <div className="pl-4">
      {entries.map((entry, i) => {
        const dotColor = TYPE_COLORS[entry.updateType] || 'bg-gray-300';
        const isLast = i === entries.length - 1;

        return (
          <div key={entry.id} className="flex">
            <div className="flex flex-col items-center mr-3">
              <div className={`h-2.5 w-2.5 rounded-full mt-1.5 ${dotColor}`} />
              {!isLast && <div className="w-0.5 flex-1 bg-gray-200 mt-1" />}
            </div>
            <div className={`flex-1 ${isLast ? 'pb-2' : 'pb-4'}`}>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-medium text-gray-500">{entry.role}</span>
                <span className="text-xs text-gray-300">{formatHumanDate(entry.dateTag) || entry.dateTag}</span>
                <span className="text-xs text-gray-300">{formatTime(entry.createdAt)}</span>
              </div>
              <span className="text-sm text-gray-700 leading-5">{entry.message}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
