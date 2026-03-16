'use client';

import { TaskListScreen } from '@/components/tasks/TaskListScreen';

export default function OwnerTaskList() {
  return <TaskListScreen basePath="/admin/tasks" />;
}
