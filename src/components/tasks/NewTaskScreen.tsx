'use client';

import { Select } from '../ui/Select';
import { useNewTaskForm } from './useNewTaskForm';
import {
  TitleField,
  DescriptionField,
  SiteAssigneeRow,
  PrioritySelector,
  DueDatePicker,
  NoteField,
} from './NewTaskFormFields';

export function NewTaskScreen() {
  const f = useNewTaskForm();

  return (
    <div className="flex-1 bg-white dark:bg-surface-950 min-h-screen">
      <NewTaskHeader
        isValid={f.isValid}
        isSubmitting={f.isSubmitting}
        color={f.color}
        onCancel={() => f.router.back()}
        onDone={f.handleDone}
      />

      <div className="flex-1 px-5 pb-8 overflow-auto">
        <div className="space-y-5 pb-20">
          <TitleField
            title={f.title}
            touched={!!f.touched.title}
            onChangeTitle={(val) => { f.setTitle(val); f.markTouched('title'); }}
          />
          <DescriptionField description={f.description} onChange={f.setDescription} />
          <SiteAssigneeRow
            singleSiteLabel={f.singleSiteLabel}
            siteOptions={f.siteOptions}
            siteId={f.siteId}
            onSiteChange={(val) => { f.setSiteId(val); f.markTouched('siteId'); }}
            siteTouched={!!f.touched.siteId}
            empOptions={f.empOptions}
            assigneeId={f.assigneeId}
            onAssigneeChange={(val) => { f.setAssigneeId(val); f.markTouched('assigneeId'); }}
            assigneeTouched={!!f.touched.assigneeId}
          />
          <PrioritySelector
            priority={f.priority}
            touched={!!f.touched.priority}
            onSelect={(val) => { f.setPriority(val); f.markTouched('priority'); }}
            color={f.color}
          />
          <DueDatePicker
            dueDate={f.dueDate}
            dueDateError={f.dueDateError}
            touched={!!f.touched.dueDate}
            onDateChange={f.handleDateChange}
          />
          <Select
            label="Category"
            placeholder="Optional"
            options={f.catOptions}
            value={f.categoryId}
            onChange={f.setCategoryId}
          />
          <NoteField note={f.note} onChange={f.setNote} />
          {f.error ? <span className="text-body text-red-600">{f.error}</span> : null}
        </div>
      </div>
    </div>
  );
}

/* ─── Header bar ─── */
function NewTaskHeader({
  isValid,
  isSubmitting,
  color,
  onCancel,
  onDone,
}: {
  isValid: boolean;
  isSubmitting: boolean;
  color: string;
  onCancel: () => void;
  onDone: () => void;
}) {
  return (
    <div className="px-5 pt-6 pb-3 flex items-center justify-between">
      <button onClick={onCancel}>
        <span className="text-body text-surface-400 dark:text-surface-500">Cancel</span>
      </button>
      <span className="text-heading text-surface-900 dark:text-surface-100">Assign task</span>
      <button onClick={onDone} disabled={isSubmitting}>
        <span
          className={`text-heading ${!isValid || isSubmitting ? 'text-surface-300 dark:text-surface-600' : ''}`}
          style={isValid && !isSubmitting ? { color } : undefined}
        >
          {isSubmitting ? 'Saving...' : 'Done'}
        </span>
      </button>
    </div>
  );
}
