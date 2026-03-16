'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useApp } from '../../store/AppContext';
import {
  useTaskAudit,
  useIndustryColor,
  useMyTeam,
  useAllEmployees,
} from '../../store/selectors';
import { useTheme } from '../../providers/ThemeProvider';
import { StatusBadge, PriorityBadge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select, type SelectOption } from '../ui/Select';
import { AuditTrail } from './AuditTrail';
import { formatDue, formatDateTime, isOverdue } from '../../utils/date';
import { getNextStatuses, canDelegateTask } from '../../utils/task-helpers';

interface TaskDetailScreenProps {
  updatePath: string;
}

export function TaskDetailScreen({ updatePath }: TaskDetailScreenProps) {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { state } = useApp();
  const { isDark } = useTheme();
  const color = useIndustryColor();
  const task = state.tasks.find((t) => t.id === id);
  const audit = useTaskAudit(id || '');

  const myTeam = useMyTeam();
  const allEmployees = useAllEmployees();
  const [noteText, setNoteText] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [showDelegate, setShowDelegate] = useState(false);
  const [delegateToId, setDelegateToId] = useState('');
  const [error, setError] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);
  const [showVerifyConfirm, setShowVerifyConfirm] = useState(false);

  if (!task) {
    return (
      <div className="flex-1 bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen flex-col">
        <span className="text-surface-400 dark:text-surface-500">Task not found</span>
        <button onClick={() => router.back()} className="mt-4">
          <span style={{ color }}>Go back</span>
        </button>
      </div>
    );
  }

  const overdue = isOverdue(task.due, task.status);

  const canApprove = (state.role === 'admin' || state.role === 'subadmin') &&
    task.status === 'Pending Approval' &&
    !task.approved;
  const canVerify = (state.role === 'admin' || state.role === 'subadmin') &&
    task.status === 'Submitted';
  const canReject = canVerify;
  const isAssignee = task.assigneeId === state.userId;
  const hasStatusTransitions = getNextStatuses(task.status, state.role, isAssignee).length > 0;
  const canUpdate = hasStatusTransitions && !canApprove && !canVerify;
  const showDelegateBtn = task && canDelegateTask(task, state.userId || '', state.role);

  // Get accountable lead name
  const accountableLead = task?.accountableLeadName
    || (task?.accountableLeadId
      ? task.accountableLeadId === 'admin'
        ? state.onboarding.adminName
        : allEmployees.find((e) => e.id === task.accountableLeadId)?.name
      : null);

  // Delegate member options (subadmin's team members, excluding self)
  const delegateOptions: SelectOption[] = myTeam
    ? myTeam.members
        .filter((m) => m.id !== state.userId)
        .map((m) => ({ label: m.name, value: m.id }))
    : [];
  const visibleDelegateOptions = delegateOptions;

  const callApi = async (url: string, opts: RequestInit = {}) => {
    setIsSubmittingStatus(true);
    setError('');
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        ...opts,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Request failed');
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
      return false;
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  const handleDelegate = async () => {
    if (!delegateToId || !task) return;
    const ok = await callApi(`/api/tasks/${task.id}/delegate`, {
      body: JSON.stringify({ assigneeUserId: delegateToId }),
    });
    if (ok) {
      setShowDelegate(false);
      setDelegateToId('');
    }
  };

  const handleApprove = async () => {
    const ok = await callApi(`/api/tasks/${task.id}/approve`);
    if (ok) router.back();
  };

  const handleVerify = async () => {
    const ok = await callApi(`/api/tasks/${task.id}/verify`);
    if (ok) router.back();
  };

  const handleRework = async () => {
    const ok = await callApi(`/api/tasks/${task.id}/rework`, {
      body: JSON.stringify({ reason: rejectReason || 'Rework required' }),
    });
    if (ok) {
      setShowReject(false);
      router.back();
    }
  };

  const addNote = async () => {
    if (!noteText.trim()) return;
    setIsSubmittingNote(true);
    setError('');
    try {
      const res = await fetch(`/api/tasks/${task.id}/note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: noteText.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to add note');
      }
      setNoteText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add note');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  return (
    <div className="flex-1 bg-surface-50 dark:bg-surface-950 min-h-screen">
      {/* Header */}
      <div className="bg-white dark:bg-surface-900 px-5 py-4 flex items-center gap-3 border-b border-surface-100 dark:border-surface-800">
        <button onClick={() => router.back()}>
          <span style={{ color: isDark ? '#d1d5db' : '#374151', fontSize: 20 }}>&larr;</span>
        </button>
        <span className="text-heading text-surface-900 dark:text-surface-100 flex-1 truncate">
          Task Detail
        </span>
      </div>

      <div className="flex-1 overflow-auto pb-24">
        <div className="lg:grid lg:grid-cols-[1fr,400px] lg:gap-6 lg:px-5 lg:mt-4">
        {/* Left column: Task info + actions */}
        <div>
        {/* Task info */}
        <Card className="mx-5 lg:mx-0 mt-4 lg:mt-0">
          <p className="text-title text-surface-900 dark:text-surface-100 mb-1">{task.title}</p>
          {task.description ? (
            <p className="text-body text-surface-500 dark:text-surface-400 mb-3">{task.description}</p>
          ) : (
            <div className="mb-3" />
          )}
          <div className="flex gap-2 mb-4">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            {task.reworked && (
              <div className="bg-amber-50 rounded-full px-2.5 py-0.5">
                <span className="text-caption text-amber-700">
                  Rework x{task.reworkCount || 1}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <InfoRow icon="person" label="Assigned to" value={task.assignee} />
            <InfoRow icon="location" label="Site" value={task.site} />
            {task.category && <InfoRow icon="pricetag" label="Category" value={task.category} />}
            <InfoRow
              icon="calendar"
              label="Due date"
              value={task.due ? formatDue(task.due) || task.due : 'No due date'}
              valueColor={overdue ? '#dc2626' : undefined}
            />
            <InfoRow icon="person-circle" label="Assigned by" value={task.assignedBy || 'Self'} />
            {accountableLead && (
              <InfoRow icon="shield-checkmark" label="Lead" value={accountableLead} />
            )}
            {task.delegatedAt && (
              <InfoRow icon="arrow-redo" label="Delegated" value={formatDateTime(task.delegatedAt)} />
            )}
            <InfoRow icon="time" label="Created" value={formatDateTime(task.createdAt)} />
          </div>

          {task.note && (
            <div className="mt-4 p-3 bg-surface-50 dark:bg-surface-800 rounded-xl">
              <span className="text-micro text-surface-400 dark:text-surface-500 block mb-1">Instruction</span>
              <span className="text-body text-surface-700 dark:text-surface-300">{task.note}</span>
            </div>
          )}
        </Card>

        {/* Delegate button for subadmins */}
        {showDelegateBtn && (
          <div className="mx-5 lg:mx-0 mt-4 space-y-2">
            {!showDelegate ? (
              <Button
                onClick={() => setShowDelegate(true)}
                style={{ backgroundColor: '#6366f1' }}
              >Delegate to Team Member</Button>
            ) : (
              <Card>
                <span className="text-caption text-surface-900 dark:text-surface-100 block mb-2">Delegate to</span>
                <Select
                  label=""
                  placeholder="Select team member"
                  options={visibleDelegateOptions}
                  value={delegateToId}
                  onChange={setDelegateToId}
                />
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={() => { setShowDelegate(false); setDelegateToId(''); }}
                    variant="outline"
                    size="default"
                    className="flex-1"
                  >Cancel</Button>
                  <Button
                    onClick={handleDelegate}
                    style={{ backgroundColor: '#6366f1' }}
                    size="default"
                    className="flex-1"
                    disabled={!delegateToId || isSubmittingStatus}
                  >Delegate</Button>
                </div>
              </Card>
            )}
          </div>
        )}

        {error ? (
          <Card className="mx-5 lg:mx-0 mt-4">
            <span className="text-body text-red-600">{error}</span>
          </Card>
        ) : null}

        {/* Action buttons */}
        {(canApprove || canVerify || canReject || canUpdate) && (
          <div className="mx-5 lg:mx-0 mt-4 space-y-2">
            {canApprove && (
              <Button onClick={handleApprove} style={{ backgroundColor: color }} disabled={isSubmittingStatus}>{isSubmittingStatus ? 'Saving...' : 'Approve Task'}</Button>
            )}
            {canVerify && !showVerifyConfirm && (
              <Button
                onClick={() => setShowVerifyConfirm(true)}
                style={{ backgroundColor: color }}
                disabled={isSubmittingStatus}
              >Verify &amp; Close</Button>
            )}
            {showVerifyConfirm && (
              <Card>
                <span className="text-caption text-surface-900 dark:text-surface-100 block mb-2">
                  Are you sure you want to verify and close this task?
                </span>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowVerifyConfirm(false)}
                    variant="outline"
                    size="default"
                    className="flex-1"
                    disabled={isSubmittingStatus}
                  >Cancel</Button>
                  <Button
                    onClick={handleVerify}
                    style={{ backgroundColor: color }}
                    size="default"
                    className="flex-1"
                    disabled={isSubmittingStatus}
                  >{isSubmittingStatus ? 'Saving...' : 'Verify'}</Button>
                </div>
              </Card>
            )}
            {canReject && !showReject && (
              <Button onClick={() => setShowReject(true)} variant="destructive" disabled={isSubmittingStatus}>Request Rework</Button>
            )}
            {showReject && (
              <Card>
                <span className="text-caption text-surface-900 dark:text-surface-100 block mb-2">Rework reason</span>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Why is rework needed?"
                  className="bg-surface-50 dark:bg-surface-800 rounded-xl px-4 py-3 text-body text-surface-900 dark:text-surface-100 mb-3 min-h-[60px] w-full resize-none border-none outline-none"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowReject(false)}
                    variant="outline"
                    size="default"
                    className="flex-1"
                  >Cancel</Button>
                  <Button
                    onClick={() => {
                      if (window.confirm('This will send the task back for rework. Continue?')) {
                        handleRework();
                      }
                    }}
                    variant="destructive"
                    size="default"
                    className="flex-1"
                    disabled={!rejectReason.trim() || isSubmittingStatus}
                  >Send to Rework</Button>
                </div>
              </Card>
            )}
            {canUpdate && (
              <Button
                onClick={() => router.push(updatePath.replace('[id]', task.id))}
                style={{ backgroundColor: color }}
                disabled={isSubmittingStatus}
              >{isSubmittingStatus ? 'Saving...' : 'Update Status'}</Button>
            )}
          </div>
        )}

        </div>

        {/* Right column: Notes + Activity */}
        <div>
        {/* Add note */}
        <Card className="mx-5 lg:mx-0 mt-4 lg:mt-0">
          <span className="text-caption text-surface-900 dark:text-surface-100 block mb-2">Add a note</span>
          <div className="flex gap-2">
            <input
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Write a note..."
              className="flex-1 bg-surface-50 dark:bg-surface-800 rounded-xl px-4 py-3 text-body text-surface-900 dark:text-surface-100 border-none outline-none"
            />
            <button
              onClick={addNote}
              disabled={!noteText.trim() || isSubmittingNote}
              className={`px-4 rounded-xl flex items-center justify-center ${!noteText.trim() || isSubmittingNote ? 'opacity-20' : ''}`}
              style={{ backgroundColor: color }}
            >
              <span className="text-white text-body">Send</span>
            </button>
          </div>
        </Card>

        {/* Audit trail */}
        <div className="mx-5 lg:mx-0 mt-4">
          <span className="text-micro text-surface-400 dark:text-surface-500 uppercase tracking-wider block mb-3">
            Activity
          </span>
          <AuditTrail entries={audit} />
        </div>
        </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-surface-400 dark:text-surface-500 w-4 text-center text-body">*</span>
      <span className="text-caption text-surface-400 dark:text-surface-500 w-20">{label}</span>
      <span className="text-body text-surface-900 dark:text-surface-100 flex-1" style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </span>
    </div>
  );
}
