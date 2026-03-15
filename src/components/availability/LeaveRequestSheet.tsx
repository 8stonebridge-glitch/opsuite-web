'use client';

import { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { useIndustryColor } from '../../store/selectors';
import { useTheme } from '../../providers/ThemeProvider';
import { getToday, getNowISO } from '../../utils/date';
import { uid } from '../../utils/id';

interface LeaveRequestSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function LeaveRequestSheet({ visible, onClose }: LeaveRequestSheetProps) {
  const { state, dispatch } = useApp();
  const color = useIndustryColor();
  const { isDark } = useTheme();
  const today = getToday();

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!state.userId || !state.activeWorkspaceId) return;

    setIsSubmitting(true);

    try {
      dispatch({
        type: 'REQUEST_AVAILABILITY',
        record: {
          id: uid(),
          organizationId: state.activeWorkspaceId,
          memberId: state.userId,
          type: 'leave',
          status: 'pending',
          startDate,
          endDate,
          notes: notes.trim(),
          requestedById: state.userId,
          approvedById: null,
          createdAt: getNowISO(),
          approvedAt: null,
        },
      });

      setStartDate(today);
      setEndDate(today);
      setNotes('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = startDate >= today && endDate >= startDate;

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="flex-1 bg-black/30 dark:bg-black/50" onClick={onClose} />
      <div className="bg-white dark:bg-gray-950 rounded-t-3xl px-5 pt-5 pb-10">
        <div className="flex items-center justify-between mb-5">
          <span className="text-base font-bold text-gray-900 dark:text-gray-100">Request Leave</span>
          <button onClick={onClose}>
            <span style={{ color: isDark ? '#9ca3af' : '#6b7280', fontSize: 22 }}>&times;</span>
          </button>
        </div>

        {/* Start Date */}
        <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-2">
          Start Date
        </span>
        <input
          type="date"
          className="bg-gray-50 dark:bg-gray-900 rounded-2xl px-4 py-3.5 text-base text-gray-900 dark:text-gray-100 mb-4 w-full border-none outline-none"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />

        {/* End Date */}
        <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-2">
          End Date
        </span>
        <input
          type="date"
          className="bg-gray-50 dark:bg-gray-900 rounded-2xl px-4 py-3.5 text-base text-gray-900 dark:text-gray-100 mb-4 w-full border-none outline-none"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />

        {/* Notes */}
        <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-2">
          Notes (optional)
        </span>
        <textarea
          className="bg-gray-50 dark:bg-gray-900 rounded-2xl px-4 py-3.5 text-base text-gray-900 dark:text-gray-100 mb-6 w-full resize-none border-none outline-none"
          placeholder="Reason for leave..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />

        {/* Submit */}
        <button
          onClick={() => void handleSubmit()}
          disabled={!isValid || isSubmitting}
          className="py-3.5 rounded-2xl w-full text-center"
          style={{ backgroundColor: isValid && !isSubmitting ? color : '#e5e7eb' }}
        >
          <span
            className="text-sm font-semibold"
            style={{ color: isValid && !isSubmitting ? '#fff' : '#9ca3af' }}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </span>
        </button>
      </div>
    </div>
  );
}
