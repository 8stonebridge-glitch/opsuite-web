'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../providers/ThemeProvider';
import { Select, type SelectOption } from '../ui/Select';
import { FormInput as Input } from '../ui/FormInput';
import { formatDue } from '../../utils/date';
import type { Priority } from '../../types';

/* ─── Title Field ─── */
export function TitleField({
  title,
  touched,
  onChangeTitle,
}: {
  title: string;
  touched: boolean;
  onChangeTitle: (val: string) => void;
}) {
  return (
    <div>
      <Input
        label="Title *"
        value={title}
        onChangeText={onChangeTitle}
        placeholder="What needs to be done"
        autoFocus
        className="text-xl"
      />
      {touched && !title.trim() ? (
        <span className="text-micro text-red-600 mt-1 block">Title is required</span>
      ) : null}
    </div>
  );
}

/* ─── Description Field ─── */
export function DescriptionField({
  description,
  onChange,
}: {
  description: string;
  onChange: (val: string) => void;
}) {
  return (
    <div>
      <span className="text-micro text-surface-400 dark:text-surface-500 uppercase tracking-wider block mb-2">
        Description
      </span>
      <textarea
        value={description}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Describe what needs to be done"
        rows={3}
        className="bg-surface-50 dark:bg-surface-800 rounded-card px-4 py-3.5 text-body text-surface-900 dark:text-surface-100 min-h-[80px] w-full resize-none border-none outline-none"
      />
    </div>
  );
}

/* ─── Site & Assignee Row ─── */
export function SiteAssigneeRow({
  singleSiteLabel,
  siteOptions,
  siteId,
  onSiteChange,
  siteTouched,
  empOptions,
  assigneeId,
  onAssigneeChange,
  assigneeTouched,
}: {
  singleSiteLabel: string;
  siteOptions: SelectOption[];
  siteId: string;
  onSiteChange: (val: string) => void;
  siteTouched: boolean;
  empOptions: SelectOption[];
  assigneeId: string;
  onAssigneeChange: (val: string) => void;
  assigneeTouched: boolean;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex-1">
        <Select
          label={`${singleSiteLabel} *`}
          placeholder="Select"
          options={siteOptions}
          value={siteId}
          onChange={onSiteChange}
        />
        {siteTouched && !siteId ? (
          <span className="text-micro text-red-600 mt-1 block">{singleSiteLabel} is required</span>
        ) : null}
      </div>
      <div className="flex-1">
        <Select
          label="Assign to *"
          placeholder="Select"
          options={empOptions}
          value={assigneeId}
          onChange={onAssigneeChange}
        />
        {assigneeTouched && !assigneeId ? (
          <span className="text-micro text-red-600 mt-1 block">Assignee is required</span>
        ) : null}
      </div>
    </div>
  );
}

/* ─── Priority Selector ─── */
const PRIORITY_OPTIONS = [['low', 'Low'], ['medium', 'Medium'], ['critical', 'High']] as const;

export function PrioritySelector({
  priority,
  touched,
  onSelect,
  color,
}: {
  priority: Priority | '';
  touched: boolean;
  onSelect: (val: Priority) => void;
  color: string;
}) {
  return (
    <div>
      <span className="text-micro text-surface-400 dark:text-surface-500 uppercase tracking-wider block mb-2">
        Priority *
      </span>
      <div className="flex gap-2">
        {PRIORITY_OPTIONS.map(([val, label]) => (
          <button
            key={val}
            onClick={() => onSelect(val)}
            className={`flex-1 py-3.5 rounded-xl text-center ${
              priority !== val ? 'border border-surface-200 dark:border-surface-700' : ''
            }`}
            style={
              priority === val
                ? {
                    backgroundColor:
                      val === 'critical' ? '#dc2626' : val === 'medium' ? '#d97706' : color,
                  }
                : undefined
            }
          >
            <span
              className={`text-caption ${
                priority === val ? 'text-white' : 'text-surface-500 dark:text-surface-400'
              }`}
            >
              {label}
            </span>
          </button>
        ))}
      </div>
      {touched && !priority ? (
        <span className="text-micro text-red-600 mt-1 block">Priority is required</span>
      ) : null}
    </div>
  );
}

/* ─── Due Date Picker ─── */
const HIDDEN_INPUT: React.CSSProperties = {
  position: 'absolute', opacity: 0, width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none',
};

function dateTextColor(dueDate: string, isDark: boolean) {
  if (!dueDate) return isDark ? '#4b5563' : '#d1d5db';
  return isDark ? '#f3f4f6' : '#111827';
}

export function DueDatePicker({
  dueDate, dueDateError, touched, onDateChange,
}: {
  dueDate: string; dueDateError: string; touched: boolean; onDateChange: (val: string) => void;
}) {
  const { isDark } = useTheme();
  const errMsg = dueDateError || (touched && !dueDate ? 'Due date is required' : '');

  // Defer to useEffect to avoid SSR/client hydration mismatch
  const [minDate, setMinDate] = useState('');
  useEffect(() => {
    setMinDate(new Date().toISOString().split('T')[0]);
  }, []);

  return (
    <div>
      <span className="text-micro text-surface-400 dark:text-surface-500 uppercase tracking-wider block mb-2">
        Due date *
      </span>
      <label
        className="flex items-center justify-between rounded-card px-4 py-3.5 cursor-pointer"
        style={{ backgroundColor: isDark ? '#1f2937' : '#f9fafb' }}
      >
        <span style={{ fontSize: 16, color: dateTextColor(dueDate, isDark) }}>
          {dueDate ? formatDue(dueDate) || dueDate : 'Select date'}
        </span>
        <span style={{ color: isDark ? '#6b7280' : '#9ca3af' }}>&#x1F4C5;</span>
        <input type="date" value={dueDate} min={minDate} onChange={(e) => onDateChange(e.target.value)} style={HIDDEN_INPUT} />
      </label>
      {errMsg ? <span className="text-micro text-red-600 mt-1 block">{errMsg}</span> : null}
    </div>
  );
}

/* ─── Note Field ─── */
export function NoteField({
  note,
  onChange,
}: {
  note: string;
  onChange: (val: string) => void;
}) {
  return (
    <div>
      <span className="text-micro text-surface-400 dark:text-surface-500 uppercase tracking-wider block mb-2">
        Instruction note
      </span>
      <textarea
        value={note}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Optional note for employee"
        rows={3}
        className="bg-surface-50 dark:bg-surface-900 rounded-card px-4 py-3.5 text-body text-surface-900 dark:text-surface-100 min-h-[80px] w-full resize-none border-none outline-none"
      />
    </div>
  );
}
