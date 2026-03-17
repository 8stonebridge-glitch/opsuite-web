'use client';

import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface TaskActionButtonsProps {
  canApprove: boolean;
  canVerify: boolean;
  canReject: boolean;
  canUpdate: boolean;
  showVerifyConfirm: boolean;
  showReject: boolean;
  rejectReason: string;
  isSubmitting: boolean;
  color: string;
  updatePath: string;
  taskId: string;
  onApprove: () => void;
  onVerify: () => void;
  onRequestVerify: () => void;
  onCancelVerify: () => void;
  onRework: () => void;
  onShowReject: () => void;
  onHideReject: () => void;
  onRejectReasonChange: (v: string) => void;
  onNavigateUpdate: () => void;
}

export function TaskActionButtons({
  canApprove, canVerify, canReject, canUpdate,
  showVerifyConfirm, showReject, rejectReason,
  isSubmitting, color,
  onApprove, onVerify, onRequestVerify, onCancelVerify,
  onRework, onShowReject, onHideReject, onRejectReasonChange,
  onNavigateUpdate,
}: TaskActionButtonsProps) {
  if (!canApprove && !canVerify && !canReject && !canUpdate) return null;
  return (
    <div className="mx-5 lg:mx-0 mt-4 space-y-2">
      {canApprove && (
        <Button onClick={onApprove} style={{ backgroundColor: color }} disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Approve Task'}
        </Button>
      )}
      {canVerify && !showVerifyConfirm && (
        <Button onClick={onRequestVerify} style={{ backgroundColor: color }} disabled={isSubmitting}>
          Verify &amp; Close
        </Button>
      )}
      {showVerifyConfirm && (
        <Card>
          <span className="text-caption text-surface-900 dark:text-surface-100 block mb-2">
            Are you sure you want to verify and close this task?
          </span>
          <div className="flex gap-2">
            <Button
              onClick={onCancelVerify}
              variant="outline"
              size="default"
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={onVerify}
              style={{ backgroundColor: color }}
              size="default"
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Verify'}
            </Button>
          </div>
        </Card>
      )}
      {canReject && !showReject && (
        <Button onClick={onShowReject} variant="destructive" disabled={isSubmitting}>
          Request Rework
        </Button>
      )}
      {showReject && (
        <Card>
          <span className="text-caption text-surface-900 dark:text-surface-100 block mb-2">
            Rework reason
          </span>
          <textarea
            value={rejectReason}
            onChange={(e) => onRejectReasonChange(e.target.value)}
            placeholder="Why is rework needed?"
            className="bg-surface-50 dark:bg-surface-800 rounded-xl px-4 py-3 text-body text-surface-900 dark:text-surface-100 mb-3 min-h-[60px] w-full resize-none border-none outline-none"
          />
          <div className="flex gap-2">
            <Button onClick={onHideReject} variant="outline" size="default" className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (window.confirm('This will send the task back for rework. Continue?')) {
                  onRework();
                }
              }}
              variant="destructive"
              size="default"
              className="flex-1"
              disabled={!rejectReason.trim() || isSubmitting}
            >
              Send to Rework
            </Button>
          </div>
        </Card>
      )}
      {canUpdate && (
        <Button onClick={onNavigateUpdate} style={{ backgroundColor: color }} disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Update Status'}
        </Button>
      )}
    </div>
  );
}
