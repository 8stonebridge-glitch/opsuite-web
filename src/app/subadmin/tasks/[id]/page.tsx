'use client';

import { TaskDetailScreen } from '@/components/tasks/TaskDetailScreen';

export default function SubAdminTaskDetail() {
  return <TaskDetailScreen updatePath="/subadmin/tasks/[id]/update" />;
}
