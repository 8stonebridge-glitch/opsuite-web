'use client';

import { TaskDetailScreen } from '../../../../../src/components/tasks/TaskDetailScreen';

export default function OwnerTaskDetail() {
  return <TaskDetailScreen updatePath="/admin/tasks/[id]/update" />;
}
