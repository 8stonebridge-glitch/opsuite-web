'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../../store/AppContext';
import {
  useCurrentName,
  useIndustryColor,
  useSitesLabel,
  useMyTeam,
  useAllEmployees,
} from '../../store/selectors';
import { useTheme } from '../../providers/ThemeProvider';
import { Select, type SelectOption } from '../ui/Select';
import { FormInput as Input } from '../ui/FormInput';
import { Button } from '../ui/Button';
import { uid } from '../../utils/id';
import { getToday, getNowISO, formatDue } from '../../utils/date';
import type { Task, Priority } from '../../types';

/** Convert a plural sitesLabel to singular properly (e.g. "Properties" -> "Property") */
function singularize(label: string): string {
  if (label.endsWith('ies')) return label.slice(0, -3) + 'y';
  if (label.endsWith('s')) return label.slice(0, -1);
  return label;
}

export function NewTaskScreen() {
  const router = useRouter();
  const { state, dispatch } = useApp();
  const { isDark } = useTheme();
  const color = useIndustryColor();
  const sitesLabel = useSitesLabel();
  const curName = useCurrentName();
  const myTeam = useMyTeam();
  const allEmployees = useAllEmployees();

  // All hooks MUST be called before any early return (React Rules of Hooks)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [siteId, setSiteId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priority, setPriority] = useState<Priority | ''>('');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [dueDateError, setDueDateError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});


  const siteOptions: SelectOption[] = state.onboarding.sites.map((s) => ({
    label: s.name,
    value: s.id,
  }));

  // Admin sees both subadmins (team leads) and employees; subadmin sees own team members only
  const availableAssignees =
    state.role === 'subadmin' && myTeam
      ? myTeam.members
      : allEmployees; // admin gets all: leads + members

  const empOptions: SelectOption[] = availableAssignees.map((e) => ({
    label: `${e.name}${e.teamName ? ` (${e.teamName}${e.role === 'subadmin' ? ' · Lead' : ''})` : ''}`,
    value: e.id,
  }));

  const catOptions: SelectOption[] = state.categories.map((c) => ({
    label: c.name,
    value: c.id,
  }));

  const isPastDate = (dateStr: string) => {
    if (!dateStr) return false;
    const today = new Date().toISOString().split('T')[0];
    return dateStr < today!;
  };

  const isValid = title.trim() && siteId && assigneeId && priority && dueDate && !isPastDate(dueDate);

  const handleDateChange = (dateStr: string) => {
    setDueDate(dateStr);
    setTouched((prev) => ({ ...prev, dueDate: true }));
    if (isPastDate(dateStr)) {
      setDueDateError('Due date cannot be in the past');
    } else {
      setDueDateError('');
    }
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    const site = state.onboarding.sites.find((s) => s.id === siteId);
    const emp = allEmployees.find((e) => e.id === assigneeId);
    const cat = state.categories.find((c) => c.id === categoryId);
    if (!emp) return;

    setError('');

    const taskId = uid();
    const today = getToday();
    const now = getNowISO();

    // Determine accountableLeadId based on who is being assigned
    let accountableLeadId: string | undefined;
    if (state.role === 'admin') {
      if (emp.role === 'subadmin') {
        // Admin assigns to subadmin: subadmin is the accountable lead
        accountableLeadId = emp.id;
      } else {
        // Admin assigns directly to employee
        accountableLeadId = 'admin';
      }
    } else if (state.role === 'subadmin') {
      // Subadmin assigns to team member: subadmin is accountable lead
      accountableLeadId = state.userId || undefined;
    }

    {
      const task: Task = {
        id: taskId,
        title: title.trim(),
        description: description.trim() || undefined,
        site: site?.name || '',
        siteId,
        category: cat?.name,
        priority: priority as Priority,
        due: dueDate || null,
        assignee: emp.name,
        assigneeId,
        teamId: emp.teamId || '',
        status: 'Open',
        assignedBy: curName,
        assignedByRole: state.role,
        note: note.trim() || undefined,
        approved: true,
        createdAt: today,
        accountableLeadId,
        delegatedAt: state.role === 'subadmin' ? now : undefined,
      };

      dispatch({ type: 'ADD_TASK', task });
      dispatch({
        type: 'ADD_AUDIT',
        entry: {
          taskId, role: 'System',
          message: `Task assigned to ${emp.name} by ${curName}.${dueDate ? ` Due date: ${dueDate}.` : ''}`,
          createdAt: now, dateTag: today, updateType: 'Assignment',
        },
      });
      if (note.trim()) {
        dispatch({
          type: 'ADD_AUDIT',
          entry: {
            taskId, role: state.role === 'admin' ? 'Admin' : 'SubAdmin',
            message: note.trim(),
            createdAt: now, dateTag: today, updateType: 'Instruction',
          },
        });
      }

      router.back();
    }
  };

  const singleSiteLabel = singularize(sitesLabel);

  return (
    <div className="flex-1 bg-white dark:bg-surface-950 min-h-screen">
      <div className="px-5 pt-6 pb-3 flex items-center justify-between">
        <button onClick={() => router.back()}>
          <span className="text-body text-surface-400 dark:text-surface-500">Cancel</span>
        </button>
        <span className="text-heading text-surface-900 dark:text-surface-100">Assign task</span>
        <button
          onClick={() => {
            if (!isValid) {
              setTouched({ title: true, siteId: true, assigneeId: true, priority: true, dueDate: true });
              return;
            }
            void handleSubmit();
          }}
          disabled={isSubmitting}
        >
          <span
            className={`text-heading ${!isValid || isSubmitting ? 'text-surface-300 dark:text-surface-600' : ''}`}
            style={isValid && !isSubmitting ? { color } : undefined}
          >
            {isSubmitting ? 'Saving...' : 'Done'}
          </span>
        </button>
      </div>

      <div className="flex-1 px-5 pb-8 overflow-auto">
        <div className="space-y-5 pb-20">
          <div>
            <Input
              label="Title *"
              value={title}
              onChangeText={(val) => { setTitle(val); setTouched((prev) => ({ ...prev, title: true })); }}
              placeholder="What needs to be done"
              autoFocus
              className="text-xl"
            />
            {touched.title && !title.trim() ? (
              <span className="text-micro text-red-600 mt-1 block">Title is required</span>
            ) : null}
          </div>

          <div>
            <span className="text-micro text-surface-400 dark:text-surface-500 uppercase tracking-wider block mb-2">
              Description
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what needs to be done"
              rows={3}
              className="bg-surface-50 dark:bg-surface-800 rounded-card px-4 py-3.5 text-body text-surface-900 dark:text-surface-100 min-h-[80px] w-full resize-none border-none outline-none"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <Select
                label={`${singleSiteLabel} *`}
                placeholder="Select"
                options={siteOptions}
                value={siteId}
                onChange={(val) => { setSiteId(val); setTouched((prev) => ({ ...prev, siteId: true })); }}
              />
              {touched.siteId && !siteId ? (
                <span className="text-micro text-red-600 mt-1 block">{singleSiteLabel} is required</span>
              ) : null}
            </div>
            <div className="flex-1">
              <Select
                label="Assign to *"
                placeholder="Select"
                options={empOptions}
                value={assigneeId}
                onChange={(val) => { setAssigneeId(val); setTouched((prev) => ({ ...prev, assigneeId: true })); }}
              />
              {touched.assigneeId && !assigneeId ? (
                <span className="text-micro text-red-600 mt-1 block">Assignee is required</span>
              ) : null}
            </div>
          </div>

          <div>
            <span className="text-micro text-surface-400 dark:text-surface-500 uppercase tracking-wider block mb-2">
              Priority *
            </span>
            <div className="flex gap-2">
              {([['low', 'Low'], ['medium', 'Medium'], ['critical', 'High']] as const).map(
                ([val, label]) => (
                  <button
                    key={val}
                    onClick={() => { setPriority(val); setTouched((prev) => ({ ...prev, priority: true })); }}
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
                )
              )}
            </div>
            {touched.priority && !priority ? (
              <span className="text-micro text-red-600 mt-1 block">Priority is required</span>
            ) : null}
          </div>

          <div>
            <span className="text-micro text-surface-400 dark:text-surface-500 uppercase tracking-wider block mb-2">
              Due date *
            </span>
            <label
              className="flex items-center justify-between rounded-card px-4 py-3.5 cursor-pointer"
              style={{ backgroundColor: isDark ? '#1f2937' : '#f9fafb' }}
            >
              <span
                style={{
                  fontSize: 16,
                  color: dueDate
                    ? (isDark ? '#f3f4f6' : '#111827')
                    : (isDark ? '#4b5563' : '#d1d5db'),
                }}
              >
                {dueDate ? formatDue(dueDate) || dueDate : 'Select date'}
              </span>
              <span style={{ color: isDark ? '#6b7280' : '#9ca3af' }}>&#x1F4C5;</span>
              <input
                type="date"
                value={dueDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => handleDateChange(e.target.value)}
                style={{
                  position: 'absolute',
                  opacity: 0,
                  width: 0,
                  height: 0,
                  overflow: 'hidden',
                  pointerEvents: 'none',
                }}
              />
            </label>
            {dueDateError ? (
              <span className="text-micro text-red-600 mt-1 block">{dueDateError}</span>
            ) : touched.dueDate && !dueDate ? (
              <span className="text-micro text-red-600 mt-1 block">Due date is required</span>
            ) : null}
          </div>

          <Select
            label="Category"
            placeholder="Optional"
            options={catOptions}
            value={categoryId}
            onChange={setCategoryId}
          />

          <div>
            <span className="text-micro text-surface-400 dark:text-surface-500 uppercase tracking-wider block mb-2">
              Instruction note
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note for employee"
              rows={3}
              className="bg-surface-50 dark:bg-surface-900 rounded-card px-4 py-3.5 text-body text-surface-900 dark:text-surface-100 min-h-[80px] w-full resize-none border-none outline-none"
            />
          </div>

          {error ? (
            <span className="text-body text-red-600">{error}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
