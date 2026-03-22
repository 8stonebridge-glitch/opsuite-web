'use client';

import { Check } from 'lucide-react';
import type { TaskStatus } from '@/types';

interface AuditSummary {
  type: string;
  message: string;
  createdAt: string;
  actorName?: string;
}

interface ApprovalChainProps {
  status: TaskStatus;
  auditEntries: AuditSummary[];
}

const STEPS: { label: string; statuses: TaskStatus[] }[] = [
  { label: 'Created', statuses: [] },
  { label: 'Pending', statuses: ['Pending Approval'] },
  { label: 'Open', statuses: ['Open'] },
  { label: 'In Progress', statuses: ['In Progress'] },
  { label: 'Submitted', statuses: ['Submitted'] },
  { label: 'Verified', statuses: ['Verified'] },
];

const STATUS_ORDER: Record<TaskStatus, number> = {
  'Open': 2,
  'Pending Approval': 1,
  'In Progress': 3,
  'Submitted': 4,
  'Verified': 5,
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** Map audit entry types to chain step indices */
function resolveStepActor(
  entries: AuditSummary[],
): Map<number, { actor: string; time: string }> {
  const map = new Map<number, { actor: string; time: string }>();

  for (const e of entries) {
    const t = e.type.toLowerCase();
    let idx = -1;
    if (t.includes('assign') || t === 'assignment') idx = 0;
    else if (t.includes('approval') || t === 'approved') idx = 1;
    else if (t === 'status' && e.message.toLowerCase().includes('open')) idx = 2;
    else if (t === 'status' && e.message.toLowerCase().includes('in progress')) idx = 3;
    else if (t === 'status' && e.message.toLowerCase().includes('submitted')) idx = 4;
    else if (t.includes('verif') || t === 'verified') idx = 5;

    if (idx >= 0 && !map.has(idx)) {
      map.set(idx, {
        actor: e.actorName || e.message.split(' ')[0],
        time: relativeTime(e.createdAt),
      });
    }
  }
  return map;
}

export function ApprovalChain({ status, auditEntries }: ApprovalChainProps) {
  const currentIdx = STATUS_ORDER[status] ?? 0;
  const actorMap = resolveStepActor(auditEntries);

  return (
    <nav aria-label="Approval lifecycle" className="w-full overflow-x-auto">
      <ol className="flex items-start gap-0 min-w-0">
        {STEPS.map((step, i) => {
          const completed = i < currentIdx;
          const current = i === currentIdx;
          const future = i > currentIdx;
          const actor = actorMap.get(i);
          const isLast = i === STEPS.length - 1;

          return (
            <li
              key={step.label}
              className="flex flex-col items-center flex-1 min-w-0"
              aria-current={current ? 'step' : undefined}
            >
              {/* Step indicator + connector row */}
              <div className="flex items-center w-full">
                {/* Left connector */}
                {i > 0 && (
                  <div
                    className={`flex-1 h-0.5 ${
                      completed || current
                        ? 'bg-emerald-400 dark:bg-emerald-500'
                        : 'bg-surface-200 dark:bg-surface-700'
                    }`}
                  />
                )}

                {/* Circle */}
                <div
                  className={`shrink-0 flex items-center justify-center rounded-full transition-all ${
                    completed
                      ? 'h-6 w-6 bg-emerald-500 dark:bg-emerald-600'
                      : current
                        ? 'h-6 w-6 ring-2 ring-emerald-400 dark:ring-emerald-500 bg-white dark:bg-surface-900'
                        : 'h-5 w-5 bg-surface-200 dark:bg-surface-700'
                  }`}
                >
                  {completed && <Check className="size-3.5 text-white" strokeWidth={3} />}
                  {current && (
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                  )}
                </div>

                {/* Right connector */}
                {!isLast && (
                  <div
                    className={`flex-1 h-0.5 ${
                      completed && i + 1 <= currentIdx
                        ? 'bg-emerald-400 dark:bg-emerald-500'
                        : 'bg-surface-200 dark:bg-surface-700'
                    }`}
                  />
                )}
              </div>

              {/* Label */}
              <span
                className={`mt-1.5 text-[10px] font-medium leading-tight text-center truncate max-w-full px-0.5 ${
                  completed
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : current
                      ? 'text-surface-900 dark:text-surface-100'
                      : 'text-surface-400 dark:text-surface-600'
                }`}
              >
                {step.label}
              </span>

              {/* Actor + time (only for completed steps) */}
              {completed && actor && (
                <span className="mt-0.5 text-[9px] text-surface-400 dark:text-surface-500 truncate max-w-full px-0.5 text-center leading-tight">
                  {actor.actor}
                  <br />
                  {actor.time}
                </span>
              )}
              {(future || (current && !actor)) && (
                <span className="mt-0.5 text-[9px] text-transparent select-none">&nbsp;</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
