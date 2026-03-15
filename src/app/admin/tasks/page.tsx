'use client';

import { TaskListScreen } from '../../../../src/components/tasks/TaskListScreen';

export default function OwnerTaskList() {
  return <TaskListScreen basePath="/admin/tasks" />;
}
