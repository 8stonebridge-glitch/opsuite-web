import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../../store/AppContext';
import {
  useIndustryColor,
  useSitesLabel,
  useMyTeam,
  useAllEmployees,
} from '../../store/selectors';
import type { SelectOption } from '../ui/Select';
import type { Priority } from '../../types';

/** Convert a plural sitesLabel to singular (e.g. "Properties" -> "Property") */
function singularize(label: string): string {
  if (label.endsWith('ies')) return label.slice(0, -3) + 'y';
  if (label.endsWith('s')) return label.slice(0, -1);
  return label;
}

function isPastDate(dateStr: string): boolean {
  if (!dateStr) return false;
  const today = new Date().toISOString().split('T')[0];
  return dateStr < today!;
}

/** Build select-option lists from app state. */
function buildOptions(state: ReturnType<typeof useApp>['state'], myTeam: ReturnType<typeof useMyTeam>, allEmployees: ReturnType<typeof useAllEmployees>) {
  const siteOptions: SelectOption[] = state.onboarding.sites.map((s) => ({
    label: s.name, value: s.id,
  }));

  const available = state.role === 'subadmin' && myTeam ? myTeam.members : allEmployees;
  const empOptions: SelectOption[] = available.map((e) => ({
    label: `${e.name}${e.teamName ? ` (${e.teamName}${e.role === 'subadmin' ? ' · Lead' : ''})` : ''}`,
    value: e.id,
  }));

  const catOptions: SelectOption[] = state.categories.map((c) => ({
    label: c.name, value: c.id,
  }));

  return { siteOptions, empOptions, catOptions };
}

/** All form state for creating a new task. */
export function useNewTaskFormState() {
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

  const markTouched = (key: string) => setTouched((prev) => ({ ...prev, [key]: true }));

  const handleDateChange = (dateStr: string) => {
    setDueDate(dateStr);
    markTouched('dueDate');
    setDueDateError(isPastDate(dateStr) ? 'Due date cannot be in the past' : '');
  };

  const isValid = !!(title.trim() && siteId && assigneeId && priority && dueDate && !isPastDate(dueDate));

  return {
    title, setTitle,
    description, setDescription,
    siteId, setSiteId,
    assigneeId, setAssigneeId,
    categoryId, setCategoryId,
    priority, setPriority,
    dueDate,
    note, setNote,
    error, setError,
    dueDateError,
    isSubmitting, setIsSubmitting,
    touched, setTouched,
    markTouched,
    handleDateChange,
    isValid,
  };
}

/** POST a new task to the API. Returns true on success. */
async function submitTask(form: ReturnType<typeof useNewTaskFormState>, allEmployees: ReturnType<typeof useAllEmployees>) {
  if (!form.isValid) return false;
  const emp = allEmployees.find((e) => e.id === form.assigneeId);
  if (!emp) return false;
  form.setError('');
  form.setIsSubmitting(true);
  try {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority,
        siteId: form.siteId || undefined,
        teamId: emp.teamId || undefined,
        assigneeUserId: form.assigneeId,
        dueDate: form.dueDate || undefined,
        note: form.note.trim() || undefined,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to create task');
    }
    return true;
  } catch (err) {
    form.setError(err instanceof Error ? err.message : 'Failed to create task');
    return false;
  } finally {
    form.setIsSubmitting(false);
  }
}

/** Composes state + context into the full form API. */
export function useNewTaskForm() {
  const router = useRouter();
  const { state } = useApp();
  const color = useIndustryColor();
  const sitesLabel = useSitesLabel();
  const myTeam = useMyTeam();
  const allEmployees = useAllEmployees();
  const form = useNewTaskFormState();
  const { siteOptions, empOptions, catOptions } = buildOptions(state, myTeam, allEmployees);

  const handleDone = () => {
    if (!form.isValid) {
      form.setTouched({ title: true, siteId: true, assigneeId: true, priority: true, dueDate: true });
      return;
    }
    void submitTask(form, allEmployees).then((ok) => { if (ok) router.back(); });
  };

  return {
    ...form,
    router,
    color,
    singleSiteLabel: singularize(sitesLabel),
    siteOptions,
    empOptions,
    catOptions,
    handleDone,
  };
}
