'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/store/AppContext';
import { useScopedTasks } from '@/store/selectors';
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { useIndustryColor } from '@/store/selectors';
import { dueLabel } from '@/utils/date';
import { useTheme } from '@/providers/ThemeProvider';
import { useMutation } from 'convex/react';
import { api } from '@/lib/convexApi';
import { CheckSquare, CheckCircle2, RotateCcw, X, AlertTriangle } from 'lucide-react';
import { SkeletonCard } from '@/components/ui/Skeleton';
import type { Task } from '@/types';
import { ApprovalDrawer } from '@/components/approvals/ApprovalDrawer';
import { useTaskAudit } from '@/store/selectors';
import { SuccessToast } from '@/components/ui/SuccessToast';

type Tab = 'pending' | 'submitted';

export default function ApprovalsPage() {
  const { state } = useApp();
  const tasks = useScopedTasks();
  const color = useIndustryColor();
  const { isDark } = useTheme();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [rejectModalTask, setRejectModalTask] = useState<Task | null>(null);
  const [reworkModalTask, setReworkModalTask] = useState<Task | null>(null);
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [optimisticRemoved, setOptimisticRemoved] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string } | null>(null);

  const approvePending = useMutation(api.tasks.approvePending);
  const verifyTask = useMutation(api.tasks.verify);
  const requestRework = useMutation(api.tasks.requestRework);
  const bulkApprove = useMutation(api.tasks.bulkApprove);

  const pendingTasks = useMemo(
    () => tasks.filter((t) => t.status === 'Pending Approval' && !optimisticRemoved.has(t.id)),
    [tasks, optimisticRemoved],
  );
  const submittedTasks = useMemo(
    () => tasks.filter((t) => t.status === 'Submitted' && !optimisticRemoved.has(t.id)),
    [tasks, optimisticRemoved],
  );

  const currentList = activeTab === 'pending' ? pendingTasks : submittedTasks;

  const markProcessing = useCallback((id: string, on: boolean) => {
    setProcessing((prev) => {
      const next = new Set(prev);
      if (on) next.add(id); else next.delete(id);
      return next;
    });
  }, []);

  const handleApprove = useCallback(async (task: Task) => {
    markProcessing(task.id, true);
    // Optimistic: hide from list immediately
    setOptimisticRemoved((prev) => new Set(prev).add(task.id));
    try {
      await approvePending({ taskId: task.id as never });
      setToast({ message: 'Task approved' });
    } catch (e) {
      console.error('Approve failed', e);
      // Rollback: re-add to list
      setOptimisticRemoved((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    } finally {
      markProcessing(task.id, false);
    }
  }, [approvePending, markProcessing]);

  const handleVerify = useCallback(async (task: Task) => {
    markProcessing(task.id, true);
    // Optimistic: hide from list immediately
    setOptimisticRemoved((prev) => new Set(prev).add(task.id));
    try {
      await verifyTask({ taskId: task.id as never });
      setToast({ message: 'Task verified' });
    } catch (e) {
      console.error('Verify failed', e);
      // Rollback: re-add to list
      setOptimisticRemoved((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    } finally {
      markProcessing(task.id, false);
    }
  }, [verifyTask, markProcessing]);

  const handleRejectConfirm = useCallback(async () => {
    if (!rejectModalTask || !reason.trim()) return;
    markProcessing(rejectModalTask.id, true);
    try {
      // Rejecting a pending approval means requesting rework-style rejection;
      // we update status back to Open with a note via updateStatus or addNote.
      // The existing approvePending moves to Open. For "reject" we use requestRework
      // which sets status to In Progress (closest semantic match).
      await requestRework({ taskId: rejectModalTask.id as never, reason: reason.trim() });
    } catch (e) {
      console.error('Reject failed', e);
    } finally {
      markProcessing(rejectModalTask.id, false);
      setRejectModalTask(null);
      setReason('');
    }
  }, [rejectModalTask, reason, requestRework, markProcessing]);

  const handleReworkConfirm = useCallback(async () => {
    if (!reworkModalTask || !reason.trim()) return;
    markProcessing(reworkModalTask.id, true);
    try {
      await requestRework({ taskId: reworkModalTask.id as never, reason: reason.trim() });
    } catch (e) {
      console.error('Rework failed', e);
    } finally {
      markProcessing(reworkModalTask.id, false);
      setReworkModalTask(null);
      setReason('');
    }
  }, [reworkModalTask, reason, requestRework, markProcessing]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleBulkApprove = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    ids.forEach((id) => markProcessing(id, true));
    try {
      await bulkApprove({ taskIds: ids as never });
      setSelectedIds(new Set());
    } catch (e) {
      console.error('Bulk approve failed', e);
    } finally {
      ids.forEach((id) => markProcessing(id, false));
    }
  }, [selectedIds, bulkApprove, markProcessing]);

  return (
    <div className="flex-1 bg-surface-50 dark:bg-surface-950 min-h-screen">
      {/* Page Header */}
      <div className="bg-white dark:bg-surface-900 border-b border-surface-100 dark:border-surface-800">
        <div className="px-5 lg:px-6 py-5 lg:py-6">
          <div className="flex items-center gap-2">
            <CheckSquare className="size-5" style={{ color }} />
            <h1 className="text-xl lg:text-title text-surface-900 dark:text-surface-100">
              Approvals
            </h1>
          </div>
          <p className="text-caption text-surface-400 dark:text-surface-500 mt-1">
            Review and approve pending tasks
          </p>
        </div>

        {/* Tabs */}
        <div className="px-5 lg:px-6 flex gap-6 border-t border-surface-100 dark:border-surface-800" role="tablist" aria-label="Approval tabs">
          <button
            role="tab"
            aria-selected={activeTab === 'pending'}
            onClick={() => setActiveTab('pending')}
            className={`py-3 text-caption font-medium border-b-2 transition-colors ${
              activeTab === 'pending'
                ? 'border-current text-surface-900 dark:text-surface-100'
                : 'border-transparent text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-300'
            }`}
            style={activeTab === 'pending' ? { color } : undefined}
          >
            Pending Approval
            {pendingTasks.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 text-[10px] font-bold">
                {pendingTasks.length}
              </span>
            )}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'submitted'}
            onClick={() => setActiveTab('submitted')}
            className={`py-3 text-caption font-medium border-b-2 transition-colors ${
              activeTab === 'submitted'
                ? 'border-current text-surface-900 dark:text-surface-100'
                : 'border-transparent text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-300'
            }`}
            style={activeTab === 'submitted' ? { color } : undefined}
          >
            Awaiting Review
            {submittedTasks.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
                {submittedTasks.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="overflow-y-auto">
        <div className="px-5 lg:px-6 pt-5 space-y-3 pb-28 md:pb-8">
          {/* Bulk actions for pending tab */}
          {activeTab === 'pending' && pendingTasks.length > 0 && (
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-caption text-surface-500 dark:text-surface-400">
                <input
                  type="checkbox"
                  aria-label="Select all pending tasks"
                  className="rounded border-surface-300 dark:border-surface-600"
                  checked={selectedIds.size === pendingTasks.length && pendingTasks.length > 0}
                  onChange={() => {
                    if (selectedIds.size === pendingTasks.length) {
                      setSelectedIds(new Set());
                    } else {
                      setSelectedIds(new Set(pendingTasks.map((t) => t.id)));
                    }
                  }}
                />
                Select all ({pendingTasks.length})
              </label>
              {selectedIds.size > 0 && (
                <button
                  onClick={handleBulkApprove}
                  className="px-4 py-2 rounded-xl text-caption font-medium text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: color }}
                >
                  Approve Selected ({selectedIds.size})
                </button>
              )}
            </div>
          )}

          {/* Task List */}
          {state.tasks.length === 0 && tasks.length === 0 ? (
            <SkeletonCard count={3} />
          ) : currentList.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title={activeTab === 'pending' ? 'No approvals waiting' : 'No tasks awaiting review'}
              description={activeTab === 'pending'
                ? 'Once team members submit tasks, they\'ll appear here for review'
                : 'Submitted tasks will appear here for verification'}
              action={{ label: 'View tasks', onClick: () => router.push('/admin/tasks') }}
            />
          ) : (
            currentList.map((task) => (
              <ApprovalCard
                key={task.id}
                task={task}
                tab={activeTab}
                isDark={isDark}
                isProcessing={processing.has(task.id)}
                isSelected={selectedIds.has(task.id)}
                onToggleSelect={() => toggleSelect(task.id)}
                onApprove={() => handleApprove(task)}
                onReject={() => { setRejectModalTask(task); setReason(''); }}
                onVerify={() => handleVerify(task)}
                onRework={() => { setReworkModalTask(task); setReason(''); }}
                onSelect={() => setSelectedTask(task)}
              />
            ))
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModalTask && (
        <ReasonModal
          title="Reject Task"
          description={`Reject "${rejectModalTask.title}"? Please provide a reason.`}
          reason={reason}
          onReasonChange={setReason}
          onConfirm={handleRejectConfirm}
          onCancel={() => { setRejectModalTask(null); setReason(''); }}
          confirmLabel="Reject"
          confirmColor="#dc2626"
        />
      )}

      {/* Rework Modal */}
      {reworkModalTask && (
        <ReasonModal
          title="Request Rework"
          description={`Send "${reworkModalTask.title}" back for rework? Please provide a reason.`}
          reason={reason}
          onReasonChange={setReason}
          onConfirm={handleReworkConfirm}
          onCancel={() => { setReworkModalTask(null); setReason(''); }}
          confirmLabel="Request Rework"
          confirmColor="#d97706"
        />
      )}

      {/* Detail Drawer */}
      <DrawerWithAudit
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onApprove={(t) => { handleApprove(t); setSelectedTask(null); }}
        onReject={async (t, r) => {
          markProcessing(t.id, true);
          try {
            await requestRework({ taskId: t.id as never, reason: r });
          } catch (e) {
            console.error('Reject failed', e);
          } finally {
            markProcessing(t.id, false);
            setSelectedTask(null);
          }
        }}
        onVerify={(t) => { handleVerify(t); setSelectedTask(null); }}
        onRework={async (t, r) => {
          markProcessing(t.id, true);
          try {
            await requestRework({ taskId: t.id as never, reason: r });
          } catch (e) {
            console.error('Rework failed', e);
          } finally {
            markProcessing(t.id, false);
            setSelectedTask(null);
          }
        }}
        isProcessing={selectedTask ? processing.has(selectedTask.id) : false}
      />

      {/* Undo Toast */}
      {toast && (
        <SuccessToast
          message={toast.message}
          undoAction={() => {
            // UI-only undo — no reverse mutation
          }}
          undoTimeoutMs={5000}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}

/* ── ApprovalCard ── */

interface ApprovalCardProps {
  task: Task;
  tab: Tab;
  isDark: boolean;
  isProcessing: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onApprove: () => void;
  onReject: () => void;
  onVerify: () => void;
  onRework: () => void;
  onSelect: () => void;
}

function ApprovalCard({
  task, tab, isDark, isProcessing, isSelected,
  onToggleSelect, onApprove, onReject, onVerify, onRework, onSelect,
}: ApprovalCardProps) {
  const due = dueLabel(task.due, task.status);

  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-start gap-3">
          {/* Checkbox for pending tab */}
          {tab === 'pending' && (
            <input
              type="checkbox"
              aria-label={`Select task: ${task.title}`}
              className="mt-1 rounded border-surface-300 dark:border-surface-600 shrink-0"
              checked={isSelected}
              onChange={onToggleSelect}
            />
          )}

          <div className="flex-1 min-w-0">
            {/* Title + badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={onSelect}
                className="text-caption font-medium text-surface-900 dark:text-surface-100 truncate hover:underline text-left"
              >
                {task.title}
              </button>
              <StatusBadge status={task.status} />
              <PriorityBadge priority={task.priority} />
            </div>

            {/* Meta */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 gap-0.5 mt-1.5">
              <div className="flex items-center gap-1">
                <span className="text-surface-400 dark:text-surface-500 text-[11px]">&#9679;</span>
                <span className="text-caption text-surface-400 dark:text-surface-500">{task.assignee}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-surface-400 dark:text-surface-500 text-[11px]">&#9679;</span>
                <span className="text-caption text-surface-400 dark:text-surface-500">{task.site}</span>
              </div>
              {task.createdAt && (
                <div className="flex items-center gap-1">
                  <span className="text-surface-400 dark:text-surface-500 text-[11px]">&#9679;</span>
                  <span className="text-caption text-surface-400 dark:text-surface-500">
                    Created {new Date(task.createdAt).toLocaleDateString()}
                  </span>
                </div>
              )}
              {due && (
                <div className="flex items-center gap-1">
                  <span style={{ color: due.urgent ? '#dc2626' : isDark ? '#6b7280' : '#9ca3af', fontSize: 11 }}>&#9679;</span>
                  <span className={`text-caption ${due.urgent ? 'text-red-600 dark:text-red-400 font-medium' : 'text-surface-400 dark:text-surface-500'}`}>
                    {due.text}
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-3">
              {tab === 'pending' ? (
                <>
                  <button
                    onClick={onApprove}
                    disabled={isProcessing}
                    aria-label={`Approve task: ${task.title}`}
                    className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors disabled:opacity-50"
                  >
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="size-3.5" />
                      Approve
                    </span>
                  </button>
                  <button
                    onClick={onReject}
                    disabled={isProcessing}
                    aria-label={`Reject task: ${task.title}`}
                    className="px-3 py-1.5 bg-red-50 dark:bg-red-950 rounded-lg hover:bg-red-100 dark:hover:bg-red-900 transition-colors disabled:opacity-50"
                  >
                    <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
                      <X className="size-3.5" />
                      Reject
                    </span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={onVerify}
                    disabled={isProcessing}
                    aria-label={`Verify task: ${task.title}`}
                    className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors disabled:opacity-50"
                  >
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="size-3.5" />
                      Verify
                    </span>
                  </button>
                  <button
                    onClick={onRework}
                    disabled={isProcessing}
                    aria-label={`Request rework for task: ${task.title}`}
                    className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors disabled:opacity-50"
                  >
                    <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <RotateCcw className="size-3.5" />
                      Rework
                    </span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── ReasonModal ── */

interface ReasonModalProps {
  title: string;
  description: string;
  reason: string;
  onReasonChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel: string;
  confirmColor: string;
}

function ReasonModal({ title, description, reason, onReasonChange, onConfirm, onCancel, confirmLabel, confirmColor }: ReasonModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div role="dialog" aria-modal="true" aria-label={title} className="bg-white dark:bg-surface-900 rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="size-5 text-amber-500" />
          <h2 className="text-body font-semibold text-surface-900 dark:text-surface-100">{title}</h2>
        </div>
        <p className="text-caption text-surface-500 dark:text-surface-400 mb-4">{description}</p>
        <textarea
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="Enter reason..."
          rows={3}
          className="w-full rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-caption text-surface-900 dark:text-surface-100 p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-caption font-medium text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!reason.trim()}
            className="px-4 py-2 rounded-xl text-caption font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: confirmColor }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── DrawerWithAudit ── */

interface DrawerWithAuditProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (task: Task) => void;
  onReject: (task: Task, reason: string) => void;
  onVerify: (task: Task) => void;
  onRework: (task: Task, reason: string) => void;
  isProcessing: boolean;
}

function DrawerWithAudit(props: DrawerWithAuditProps) {
  const auditEntries = useTaskAudit(props.task?.id ?? '');

  return (
    <ApprovalDrawer
      task={props.task}
      auditEntries={auditEntries}
      isOpen={props.isOpen}
      onClose={props.onClose}
      onApprove={props.onApprove}
      onReject={props.onReject}
      onVerify={props.onVerify}
      onRework={props.onRework}
      isProcessing={props.isProcessing}
    />
  );
}
