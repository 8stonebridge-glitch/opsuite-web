'use client';

import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select, type SelectOption } from '../ui/Select';
import { StatusBadge, PriorityBadge } from '../ui/Badge';
import { AuditTrail } from './AuditTrail';
import { formatDue, formatDateTime } from '../../utils/date';
import type { Task, AuditEntry } from '../../types';

export { TaskActionButtons } from './TaskActionButtons';

// ── InfoRow ───────────────────────────────────────────────────────────

export function InfoRow({
  label,
  value,
  valueColor,
}: {
  icon?: string;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-surface-400 dark:text-surface-500 w-4 text-center text-body">*</span>
      <span className="text-caption text-surface-400 dark:text-surface-500 w-20">{label}</span>
      <span
        className="text-body text-surface-900 dark:text-surface-100 flex-1"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </span>
    </div>
  );
}

// ── TaskInfoCard ──────────────────────────────────────────────────────

interface TaskInfoCardProps {
  task: Task;
  overdue: boolean;
  accountableLead: string | null | undefined;
}

export function TaskInfoCard({ task, overdue, accountableLead }: TaskInfoCardProps) {
  return (
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
            <span className="text-caption text-amber-700">Rework x{task.reworkCount || 1}</span>
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
          <span className="text-micro text-surface-400 dark:text-surface-500 block mb-1">
            Instruction
          </span>
          <span className="text-body text-surface-700 dark:text-surface-300">{task.note}</span>
        </div>
      )}
    </Card>
  );
}

// ── DelegatePanel ─────────────────────────────────────────────────────

interface DelegatePanelProps {
  showDelegateBtn: boolean;
  showDelegate: boolean;
  delegateToId: string;
  delegateOptions: SelectOption[];
  isSubmitting: boolean;
  onOpen: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  onSelectMember: (id: string) => void;
}

export function DelegatePanel({
  showDelegateBtn,
  showDelegate,
  delegateToId,
  delegateOptions,
  isSubmitting,
  onOpen,
  onCancel,
  onConfirm,
  onSelectMember,
}: DelegatePanelProps) {
  if (!showDelegateBtn) return null;
  return (
    <div className="mx-5 lg:mx-0 mt-4 space-y-2">
      {!showDelegate ? (
        <Button onClick={onOpen} style={{ backgroundColor: '#6366f1' }}>
          Delegate to Team Member
        </Button>
      ) : (
        <Card>
          <span className="text-caption text-surface-900 dark:text-surface-100 block mb-2">
            Delegate to
          </span>
          <Select
            label=""
            placeholder="Select team member"
            options={delegateOptions}
            value={delegateToId}
            onChange={onSelectMember}
          />
          <div className="flex gap-2 mt-3">
            <Button
              onClick={onCancel}
              variant="outline"
              size="default"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              style={{ backgroundColor: '#6366f1' }}
              size="default"
              className="flex-1"
              disabled={!delegateToId || isSubmitting}
            >
              Delegate
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

// ── TaskNotePanel ─────────────────────────────────────────────────────

interface TaskNotePanelProps {
  noteText: string;
  isSubmitting: boolean;
  color: string;
  audit: AuditEntry[];
  onNoteChange: (v: string) => void;
  onAddNote: () => void;
}

export function TaskNotePanel({
  noteText, isSubmitting, color, audit, onNoteChange, onAddNote,
}: TaskNotePanelProps) {
  return (
    <div>
      <Card className="mx-5 lg:mx-0 mt-4 lg:mt-0">
        <span className="text-caption text-surface-900 dark:text-surface-100 block mb-2">
          Add a note
        </span>
        <div className="flex gap-2">
          <input
            value={noteText}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Write a note..."
            className="flex-1 bg-surface-50 dark:bg-surface-800 rounded-xl px-4 py-3 text-body text-surface-900 dark:text-surface-100 border-none outline-none"
          />
          <button
            onClick={onAddNote}
            disabled={!noteText.trim() || isSubmitting}
            className={`px-4 rounded-xl flex items-center justify-center ${!noteText.trim() || isSubmitting ? 'opacity-20' : ''}`}
            style={{ backgroundColor: color }}
          >
            <span className="text-white text-body">Send</span>
          </button>
        </div>
      </Card>
      <div className="mx-5 lg:mx-0 mt-4">
        <span className="text-micro text-surface-400 dark:text-surface-500 uppercase tracking-wider block mb-3">
          Activity
        </span>
        <AuditTrail entries={audit} />
      </div>
    </div>
  );
}
