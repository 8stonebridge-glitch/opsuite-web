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
import { Card } from '../ui/Card';
import { isOverdue } from '../../utils/date';
import { getNextStatuses, canDelegateTask } from '../../utils/task-helpers';
import {
  TaskInfoCard,
  DelegatePanel,
  TaskActionButtons,
  TaskNotePanel,
} from './TaskDetailPanels';
import type { SelectOption } from '../ui/Select';

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
    task.status === 'Pending Approval' && !task.approved;
  const canVerify = (state.role === 'admin' || state.role === 'subadmin') &&
    task.status === 'Submitted';
  const canReject = canVerify;
  const isAssignee = task.assigneeId === state.userId;
  const hasStatusTransitions = getNextStatuses(task.status, state.role, isAssignee).length > 0;
  const canUpdate = hasStatusTransitions && !canApprove && !canVerify;
  const showDelegateBtn = canDelegateTask(task, state.userId || '', state.role);

  const accountableLead = task?.accountableLeadName
    || (task?.accountableLeadId
      ? task.accountableLeadId === 'admin'
        ? state.onboarding.adminName
        : allEmployees.find((e) => e.id === task.accountableLeadId)?.name
      : null);

  const delegateOptions: SelectOption[] = myTeam
    ? myTeam.members
        .filter((m) => m.id !== state.userId)
        .map((m) => ({ label: m.name, value: m.id }))
    : [];

  // Auth is handled by Clerk middleware on all /api/* routes (cookies sent automatically).
  // State refresh happens via Convex real-time subscriptions in ConvexDataBridge — no manual refetch needed.
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
    if (!delegateToId) return;
    const ok = await callApi(`/api/tasks/${task.id}/delegate`, {
      body: JSON.stringify({ assigneeUserId: delegateToId }),
    });
    if (ok) { setShowDelegate(false); setDelegateToId(''); }
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
    if (ok) { setShowReject(false); router.back(); }
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
          <div>
            <TaskInfoCard task={task} overdue={overdue} accountableLead={accountableLead} />
            <DelegatePanel
              showDelegateBtn={showDelegateBtn}
              showDelegate={showDelegate}
              delegateToId={delegateToId}
              delegateOptions={delegateOptions}
              isSubmitting={isSubmittingStatus}
              onOpen={() => setShowDelegate(true)}
              onCancel={() => { setShowDelegate(false); setDelegateToId(''); }}
              onConfirm={handleDelegate}
              onSelectMember={setDelegateToId}
            />
            {error ? (
              <Card className="mx-5 lg:mx-0 mt-4">
                <span className="text-body text-red-600">{error}</span>
              </Card>
            ) : null}
            <TaskActionButtons
              canApprove={canApprove}
              canVerify={canVerify}
              canReject={canReject}
              canUpdate={canUpdate}
              showVerifyConfirm={showVerifyConfirm}
              showReject={showReject}
              rejectReason={rejectReason}
              isSubmitting={isSubmittingStatus}
              color={color}
              updatePath={updatePath}
              taskId={task.id}
              onApprove={handleApprove}
              onVerify={handleVerify}
              onRequestVerify={() => setShowVerifyConfirm(true)}
              onCancelVerify={() => setShowVerifyConfirm(false)}
              onRework={handleRework}
              onShowReject={() => setShowReject(true)}
              onHideReject={() => setShowReject(false)}
              onRejectReasonChange={setRejectReason}
              onNavigateUpdate={() => router.push(updatePath.replace('[id]', task.id))}
            />
          </div>
          <div>
            <TaskNotePanel
              noteText={noteText}
              isSubmitting={isSubmittingNote}
              color={color}
              audit={audit}
              onNoteChange={setNoteText}
              onAddNote={addNote}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
