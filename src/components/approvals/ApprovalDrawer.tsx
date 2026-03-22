'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import {
  X,
  CheckCircle2,
  RotateCcw,
  Calendar,
  MapPin,
  User,
  Clock,
  FileText,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import type { Task, AuditEntry, TaskStatus } from '@/types';
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge';
import { AuditTrail } from '@/components/tasks/AuditTrail';
import { ApprovalChain } from './ApprovalChain';
import { formatDue } from '@/utils/date';

export interface ApprovalDrawerProps {
  task: Task | null;
  auditEntries: AuditEntry[];
  isOpen: boolean;
  onClose: () => void;
  onApprove: (task: Task) => void;
  onReject: (task: Task, reason: string) => void;
  onVerify: (task: Task) => void;
  onRework: (task: Task, reason: string) => void;
  isProcessing?: boolean;
}

export function ApprovalDrawer({
  task,
  auditEntries,
  isOpen,
  onClose,
  onApprove,
  onReject,
  onVerify,
  onRework,
  isProcessing = false,
}: ApprovalDrawerProps) {
  const [reason, setReason] = useState('');
  const [showReasonFor, setShowReasonFor] = useState<'reject' | 'rework' | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Reset reason form when task changes or drawer closes
  useEffect(() => {
    setReason('');
    setShowReasonFor(null);
  }, [task?.id, isOpen]);

  // Escape key handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    },
    [isOpen, onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleReasonSubmit = useCallback(() => {
    if (!task || !reason.trim()) return;
    if (showReasonFor === 'reject') onReject(task, reason.trim());
    else if (showReasonFor === 'rework') onRework(task, reason.trim());
    setReason('');
    setShowReasonFor(null);
  }, [task, reason, showReasonFor, onReject, onRework]);

  const isPending = task?.status === 'Pending Approval';
  const isSubmitted = task?.status === 'Submitted';

  const chainEntries = auditEntries.map((e) => ({
    type: e.updateType,
    message: e.message,
    createdAt: e.createdAt,
    actorName: e.role,
  }));

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={task ? `Task details: ${task.title}` : 'Task details'}
        className={`fixed right-0 top-0 h-full w-96 lg:w-[480px] z-50 flex flex-col
          bg-white dark:bg-surface-900 shadow-2xl border-l border-surface-100 dark:border-surface-800
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {task && (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-surface-100 dark:border-surface-800">
              <div className="flex-1 min-w-0">
                <h2 className="text-body font-semibold text-surface-900 dark:text-surface-100 leading-snug">
                  {task.title}
                </h2>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <StatusBadge status={task.status} />
                  <PriorityBadge priority={task.priority} />
                </div>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                aria-label="Close drawer"
              >
                <X className="size-5 text-surface-400 dark:text-surface-500" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              {/* Approval Chain */}
              <div className="px-5 py-4 border-b border-surface-100 dark:border-surface-800">
                <ApprovalChain status={task.status} auditEntries={chainEntries} />
              </div>

              {/* Details */}
              <div className="px-5 py-4 border-b border-surface-100 dark:border-surface-800 space-y-3">
                {task.description && (
                  <div className="flex items-start gap-2.5">
                    <FileText className="size-4 text-surface-400 dark:text-surface-500 mt-0.5 shrink-0" />
                    <p className="text-caption text-surface-600 dark:text-surface-300 leading-relaxed">
                      {task.description}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2.5">
                  <User className="size-4 text-surface-400 dark:text-surface-500 shrink-0" />
                  <span className="text-caption text-surface-600 dark:text-surface-300">
                    {task.assignee}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <MapPin className="size-4 text-surface-400 dark:text-surface-500 shrink-0" />
                  <span className="text-caption text-surface-600 dark:text-surface-300">
                    {task.site}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <Clock className="size-4 text-surface-400 dark:text-surface-500 shrink-0" />
                  <span className="text-caption text-surface-400 dark:text-surface-500">
                    Created {new Date(task.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                {task.due && (
                  <div className="flex items-center gap-2.5">
                    <Calendar className="size-4 text-surface-400 dark:text-surface-500 shrink-0" />
                    <span className="text-caption text-surface-600 dark:text-surface-300">
                      Due {formatDue(task.due)}
                    </span>
                  </div>
                )}
              </div>

              {/* Audit Trail */}
              <div className="px-5 py-4">
                <h3 className="text-caption font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-3">
                  Activity
                </h3>
                <AuditTrail entries={auditEntries} />
              </div>
            </div>

            {/* Actions footer */}
            <div className="border-t border-surface-100 dark:border-surface-800 px-5 py-4 space-y-3">
              {/* Inline reason textarea */}
              {showReasonFor && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="size-4 text-amber-500" />
                    <span className="text-caption font-medium text-surface-700 dark:text-surface-300">
                      {showReasonFor === 'reject' ? 'Rejection reason' : 'Rework reason'}
                    </span>
                  </div>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Enter reason (required)..."
                    rows={3}
                    className="w-full rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-caption text-surface-900 dark:text-surface-100 p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    // eslint-disable-next-line jsx-a11y/no-autofocus
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => { setShowReasonFor(null); setReason(''); }}
                      className="px-3 py-1.5 rounded-lg text-caption font-medium text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReasonSubmit}
                      disabled={!reason.trim() || isProcessing}
                      className="px-3 py-1.5 rounded-lg text-caption font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                      style={{
                        backgroundColor: showReasonFor === 'reject' ? '#dc2626' : '#d97706',
                      }}
                    >
                      {showReasonFor === 'reject' ? 'Confirm Reject' : 'Confirm Rework'}
                    </button>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              {!showReasonFor && (
                <div className="flex gap-2">
                  {isPending && (
                    <>
                      <button
                        onClick={() => onApprove(task)}
                        disabled={isProcessing}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-caption font-semibold text-emerald-600 dark:text-emerald-400">
                          Approve
                        </span>
                      </button>
                      <button
                        onClick={() => setShowReasonFor('reject')}
                        disabled={isProcessing}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-950 rounded-xl hover:bg-red-100 dark:hover:bg-red-900 transition-colors disabled:opacity-50"
                      >
                        <X className="size-4 text-red-600 dark:text-red-400" />
                        <span className="text-caption font-semibold text-red-600 dark:text-red-400">
                          Reject
                        </span>
                      </button>
                    </>
                  )}

                  {isSubmitted && (
                    <>
                      <button
                        onClick={() => onVerify(task)}
                        disabled={isProcessing}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors disabled:opacity-50"
                      >
                        <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-caption font-semibold text-emerald-600 dark:text-emerald-400">
                          Verify
                        </span>
                      </button>
                      <button
                        onClick={() => setShowReasonFor('rework')}
                        disabled={isProcessing}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-950 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors disabled:opacity-50"
                      >
                        <RotateCcw className="size-4 text-amber-600 dark:text-amber-400" />
                        <span className="text-caption font-semibold text-amber-600 dark:text-amber-400">
                          Rework
                        </span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
