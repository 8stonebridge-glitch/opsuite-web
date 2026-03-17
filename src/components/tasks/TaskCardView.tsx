'use client';

import { TaskCard } from './TaskCard';
import { EmptyState } from '../ui/EmptyState';
import type { Task } from '../../types';
import type { TaskSection } from '../../utils/taskSections';

interface TaskCardViewProps {
  sections: TaskSection[];
  stalledThreshold: number;
  getStalledDays: (task: Task) => number;
  onPress: (id: string) => void;
}

const SECTION_ACCENT: Record<string, string> = {
  Overdue: 'text-red-500',
  Stalled: 'text-amber-600',
  Rework: 'text-amber-600',
};

const SECTION_ICON: Record<string, string> = {
  Overdue: '!',
  Stalled: '||',
  Rework: 'R',
};

function SectionHeader({ title, count }: { title: string; count: number }) {
  const accent = SECTION_ACCENT[title] || 'text-surface-400 dark:text-surface-500';
  const icon = SECTION_ICON[title];
  return (
    <div className="flex items-center gap-2 mb-2 mt-1">
      {icon && <span className={`${accent} text-body`}>{icon}</span>}
      <span className={`text-micro uppercase tracking-wider ${accent}`}>
        {title} · {count}
      </span>
    </div>
  );
}

export function TaskCardView({
  sections,
  stalledThreshold,
  getStalledDays,
  onPress,
}: TaskCardViewProps) {
  if (sections.length === 0) {
    return <EmptyState icon="clipboard-outline" title="No tasks" />;
  }
  return (
    <>
      {sections.map((section) => (
        <div key={section.title}>
          <SectionHeader title={section.title} count={section.data.length} />
          {section.data.map((item) => {
            const stalledDays = getStalledDays(item);
            return (
              <TaskCard
                key={item.id}
                task={item}
                onPress={() => onPress(item.id)}
                stalledDays={stalledDays >= stalledThreshold ? stalledDays : undefined}
              />
            );
          })}
          <div className="h-3" />
        </div>
      ))}
    </>
  );
}
