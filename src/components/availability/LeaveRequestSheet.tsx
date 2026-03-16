'use client';

import { useState } from 'react';
import { useIndustryColor } from '../../store/selectors';
import { useTheme } from '../../providers/ThemeProvider';
import { getToday } from '../../utils/date';

interface LeaveRequestSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function LeaveRequestSheet({ visible, onClose }: LeaveRequestSheetProps) {
  const color = useIndustryColor();
  const { isDark } = useTheme();
  const today = getToday();

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'leave',
          startDate,
          endDate,
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit leave request');
      }

      setStartDate(today);
      setEndDate(today);
      setNotes('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit leave request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = startDate >= today && endDate >= startDate;

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="flex-1 bg-black/30 dark:bg-black/50" onClick={onClose} />
      <div className="bg-white dark:bg-surface-950 rounded-t-3xl px-5 pt-5 pb-10">
        <div className="flex items-center justify-between mb-5">
          <span className="text-heading text-surface-900 dark:text-surface-100">Request Leave</span>
          <button onClick={onClose}>
            <span style={{ color: isDark ? '#9ca3af' : '#6b7280', fontSize: 22 }}>&times;</span>
          </button>
        </div>

        {/* Start Date */}
        <span className="text-caption text-surface-400 dark:text-surface-500 uppercase tracking-wider block mb-2">
          Start Date
        </span>
        <input
          type="date"
          className="bg-surface-50 dark:bg-surface-900 rounded-card px-4 py-3.5 text-body text-surface-900 dark:text-surface-100 mb-4 w-full border-none outline-none"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />

        {/* End Date */}
        <span className="text-caption text-surface-400 dark:text-surface-500 uppercase tracking-wider block mb-2">
          End Date
        </span>
        <input
          type="date"
          className="bg-surface-50 dark:bg-surface-900 rounded-card px-4 py-3.5 text-body text-surface-900 dark:text-surface-100 mb-4 w-full border-none outline-none"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />

        {/* Notes */}
        <span className="text-caption text-surface-400 dark:text-surface-500 uppercase tracking-wider block mb-2">
          Notes (optional)
        </span>
        <textarea
          className="bg-surface-50 dark:bg-surface-900 rounded-card px-4 py-3.5 text-body text-surface-900 dark:text-surface-100 mb-6 w-full resize-none border-none outline-none"
          placeholder="Reason for leave..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />

        {/* Submit */}
        <button
          onClick={() => void handleSubmit()}
          disabled={!isValid || isSubmitting}
          className="py-3.5 rounded-card w-full text-center"
          style={{ backgroundColor: isValid && !isSubmitting ? color : '#e5e7eb' }}
        >
          <span
            className="text-caption"
            style={{ color: isValid && !isSubmitting ? '#fff' : '#9ca3af' }}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </span>
        </button>
      </div>
    </div>
  );
}
