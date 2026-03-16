'use client';

import { TaskDetailScreen } from '@/components/tasks/TaskDetailScreen';

export default function OwnerTaskDetail() {
  return <TaskDetailScreen updatePath="/admin/tasks/[id]/update" />;
}
