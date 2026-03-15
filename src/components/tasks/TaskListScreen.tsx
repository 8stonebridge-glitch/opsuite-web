'use client';

import { useState, useMemo, useCallback, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RoleSwitcher } from '../layout/RoleSwitcher';
import { SearchInput } from '../ui/SearchInput';
import { TaskCard } from './TaskCard';
import { TaskTableRow } from './TaskTableRow';
import { TaskTableHeader } from './TaskTableHeader';
import { TaskFilters, type FilterValue } from './TaskFilters';
import { EmptyState } from '../ui/EmptyState';
import { useApp } from '../../store/AppContext';
import {
  useScopedTasks,
  useMyAssignedTasks,
  useIndustryColor,
  useTeams,
} from '../../store/selectors';
import { isOverdue } from '../../utils/date';
import { consecutiveNoChangeWorkdays, isStalledTask } from '../../utils/task-helpers';
import { useTheme } from '../../providers/ThemeProvider';
import type { Task, Team } from '../../types';

type GroupBy = 'status' | 'site' | 'team';
type DisplayMode = 'cards' | 'table';

interface TaskListScreenProps {
  basePath: string;
}

interface Section {
  title: string;
  data: Task[];
}

// ── Sort helpers ───────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<string, number> = { critical: 0, medium: 1, low: 2 };
const STATUS_ORDER: Record<string, number> = {
  'Open': 0, 'In Progress': 1, 'Pending Approval': 2, 'Completed': 3, 'Verified': 4,
};
const PAGE_SIZE = 20;

function compareTasks(a: Task, b: Task, key: string, dir: 'asc' | 'desc', teams: Team[]): number {
  const mul = dir === 'asc' ? 1 : -1;

  switch (key) {
    case 'due': {
      // nulls last
      if (!a.due && !b.due) return 0;
      if (!a.due) return 1;
      if (!b.due) return -1;
      return mul * a.due.localeCompare(b.due);
    }
    case 'priority':
      return mul * ((PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2));
    case 'status':
      return mul * ((STATUS_ORDER[a.status] ?? 4) - (STATUS_ORDER[b.status] ?? 4));
    case 'lastActivity': {
      const aDate = a.lastActivityAt || a.createdAt;
      const bDate = b.lastActivityAt || b.createdAt;
      return mul * bDate.localeCompare(aDate); // newest first by default
    }
    case 'assignee':
      return mul * a.assignee.localeCompare(b.assignee);
    case 'site':
      return mul * a.site.localeCompare(b.site);
    case 'team': {
      const aTeam = teams.find((t) => t.id === a.teamId)?.name || '';
      const bTeam = teams.find((t) => t.id === b.teamId)?.name || '';
      return mul * aTeam.localeCompare(bTeam);
    }
    case 'title':
      return mul * a.title.localeCompare(b.title);
    default:
      return 0;
  }
}

// ── Component ──────────────────────────────────────────────────────────

export function TaskListScreen(props: TaskListScreenProps) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading...</div>}>
      <TaskListScreenInner {...props} />
    </Suspense>
  );
}

function TaskListScreenInner({ basePath }: TaskListScreenProps) {
  const { state } = useApp();
  const { isDark } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterParam = searchParams.get('filter') || undefined;
  const color = useIndustryColor();
  const teams = useTeams();
  const localScoped = useScopedTasks();
  const localAssigned = useMyAssignedTasks();

  const isManager = state.role === 'admin' || state.role === 'subadmin';
  const allScoped = localScoped;
  const myAssigned = localAssigned;
  const [scope, setScope] = useState<'assigned' | 'all'>('assigned');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterValue>('active');
  const [groupBy, setGroupBy] = useState<GroupBy>('status');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('cards');
  const [tableSortKey, setTableSortKey] = useState('due');
  const [tableSortDir, setTableSortDir] = useState<'asc' | 'desc'>('asc');
  const [tableVisibleCount, setTableVisibleCount] = useState(PAGE_SIZE);

  // Auto-select tab when navigated with ?filter= query param (e.g. from inbox)
  useEffect(() => {
    const f = filterParam?.toLowerCase();
    if (f === 'review' || f === 'active' || f === 'done') {
      setFilter(f as FilterValue);
    }
  }, [filterParam]);

  const baseTasks = isManager ? (scope === 'assigned' ? myAssigned : allScoped) : allScoped;
  const stalledThreshold = state.orgSettings.noChangeAlertWorkdays;

  const getStalledDays = useCallback(
    (task: Task) => {
      if (typeof task.stalledDays === 'number') return task.stalledDays;
      return consecutiveNoChangeWorkdays(
        task.id,
        task.assigneeId,
        state.audit,
        new Date().toISOString().split('T')[0],
        state.availability
      );
    },
    [state.audit, state.availability]
  );

  // Search filter
  const searched = useMemo(() => {
    if (!search) return baseTasks;
    const q = search.toLowerCase();
    return baseTasks.filter(
      (t) =>
        `${t.title}${t.site}${t.assignee}${t.category || ''}${t.status}`
          .toLowerCase()
          .includes(q)
    );
  }, [baseTasks, search]);

  // Counts for filter tabs
  const counts = useMemo(() => {
    const active = searched.filter(
      (t) => t.status === 'Open' || t.status === 'In Progress'
    ).length;
    const review = searched.filter(
      (t) => t.status === 'Pending Approval' || t.status === 'Completed'
    ).length;
    const done = searched.filter((t) => t.status === 'Verified').length;
    return { active, review, done };
  }, [searched]);

  // Get filtered tasks for current tab
  const filteredTasks = useMemo(() => {
    if (filter === 'active') {
      return searched.filter((t) => t.status === 'Open' || t.status === 'In Progress');
    }
    if (filter === 'review') {
      return searched.filter((t) => t.status === 'Pending Approval' || t.status === 'Completed');
    }
    if (filter === 'done') {
      return searched.filter((t) => t.status === 'Verified');
    }
    return [];
  }, [searched, filter]);

  // ── Card mode: sections ──────────────────────────────────────────────
  const sections: Section[] = useMemo(() => {
    if (groupBy === 'site') {
      const bySite = new Map<string, Task[]>();
      for (const t of filteredTasks) {
        const key = t.site || 'Unknown';
        if (!bySite.has(key)) bySite.set(key, []);
        bySite.get(key)!.push(t);
      }
      return Array.from(bySite.entries()).map(([title, data]) => ({ title, data }));
    }

    if (groupBy === 'team') {
      const byTeam = new Map<string, Task[]>();
      for (const t of filteredTasks) {
        const team = teams.find((tm) => tm.id === t.teamId);
        const key = team?.name || 'Unknown';
        if (!byTeam.has(key)) byTeam.set(key, []);
        byTeam.get(key)!.push(t);
      }
      return Array.from(byTeam.entries()).map(([title, data]) => ({ title, data }));
    }

    // Default: status subsections
    if (filter === 'active') {
      const overdueTasks = filteredTasks.filter((t) => isOverdue(t.due, t.status));
      const stalledTasks = filteredTasks.filter(
        (t) =>
          !isOverdue(t.due, t.status) &&
          (typeof t.stalledDays === 'number'
            ? t.stalledDays >= stalledThreshold
            : isStalledTask(t, state.audit, stalledThreshold, state.availability))
      );
      const stalledIds = new Set(stalledTasks.map((t) => t.id));
      const reworkTasks = filteredTasks.filter(
        (t) => t.reworked && !isOverdue(t.due, t.status) && !stalledIds.has(t.id)
      );
      const normalTasks = filteredTasks.filter(
        (t) => !isOverdue(t.due, t.status) && !t.reworked && !stalledIds.has(t.id)
      );
      const groups: Section[] = [];
      if (overdueTasks.length) groups.push({ title: 'Overdue', data: overdueTasks });
      if (stalledTasks.length) groups.push({ title: 'Stalled', data: stalledTasks });
      if (reworkTasks.length) groups.push({ title: 'Rework', data: reworkTasks });
      if (normalTasks.length) groups.push({ title: 'Active', data: normalTasks });
      return groups;
    }

    if (filter === 'review') {
      const pending = filteredTasks.filter((t) => t.status === 'Pending Approval');
      const completed = filteredTasks.filter((t) => t.status === 'Completed');
      const groups: Section[] = [];
      if (pending.length) groups.push({ title: 'Pending Approval', data: pending });
      if (completed.length) groups.push({ title: 'Awaiting Verification', data: completed });
      return groups;
    }

    if (filter === 'done') {
      if (filteredTasks.length) return [{ title: 'Done', data: filteredTasks }];
      return [];
    }

    return [];
  }, [filteredTasks, filter, groupBy, stalledThreshold, state.audit, state.availability]);

  // ── Table mode: sorted flat list ─────────────────────────────────────
  const sortedTasks = useMemo(() => {
    const sorted = [...filteredTasks];
    // Overdue items always float to top
    sorted.sort((a, b) => {
      const aOverdue = isOverdue(a.due, a.status) ? 0 : 1;
      const bOverdue = isOverdue(b.due, b.status) ? 0 : 1;
      if (aOverdue !== bOverdue) return aOverdue - bOverdue;
      return compareTasks(a, b, tableSortKey, tableSortDir, teams);
    });
    return sorted;
  }, [filteredTasks, tableSortKey, tableSortDir, teams]);

  const visibleTableTasks = useMemo(
    () => sortedTasks.slice(0, tableVisibleCount),
    [sortedTasks, tableVisibleCount]
  );

  // Reset pagination when filter/search changes
  const handleFilterChange = useCallback((f: FilterValue) => {
    setFilter(f);
    setTableVisibleCount(PAGE_SIZE);
  }, []);

  const handleSearchChange = useCallback((text: string) => {
    setSearch(text);
    setTableVisibleCount(PAGE_SIZE);
  }, []);

  const handleSort = useCallback((key: string) => {
    setTableSortKey((prev) => {
      if (prev === key) {
        setTableSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setTableSortDir('asc');
      return key;
    });
  }, []);

  const goToDetail = (id: string) => {
    router.push(`${basePath}/${id}`);
  };

  const goToNew = () => {
    router.push(`${basePath}/new`);
  };

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-950 min-h-screen">
      <RoleSwitcher />

      <div className="flex-1 px-5 pt-3">
        {isManager && (
          <div className="flex rounded-2xl bg-gray-200 dark:bg-gray-800 p-1 mb-4">
            <button
              onClick={() => { setScope('assigned'); setFilter('active'); setTableVisibleCount(PAGE_SIZE); }}
              className={`flex-1 py-2.5 rounded-xl text-center ${
                scope === 'assigned' ? 'bg-white dark:bg-gray-900 shadow-sm' : ''
              }`}
            >
              <span className={`text-sm font-semibold ${scope === 'assigned' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                My Assigned{' '}
                <span className="text-gray-400 dark:text-gray-500 font-normal">{myAssigned.length}</span>
              </span>
            </button>
            <button
              onClick={() => { setScope('all'); setFilter('active'); setTableVisibleCount(PAGE_SIZE); }}
              className={`flex-1 py-2.5 rounded-xl text-center ${
                scope === 'all' ? 'bg-white dark:bg-gray-900 shadow-sm' : ''
              }`}
            >
              <span className={`text-sm font-semibold ${scope === 'all' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                All Tasks{' '}
                <span className="text-gray-400 dark:text-gray-500 font-normal">{allScoped.length}</span>
              </span>
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="flex-1">
            <SearchInput value={search} onChangeText={handleSearchChange} />
          </div>
          {/* GroupBy toggle — only in card mode for owner admin */}
          {displayMode === 'cards' && state.role === 'admin' && (
            <button
              onClick={() => {
                const next: GroupBy =
                  groupBy === 'status' ? 'site' : groupBy === 'site' ? 'team' : 'status';
                setGroupBy(next);
              }}
              className="h-10 w-10 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center"
            >
              <span style={{ color: groupBy !== 'status' ? color : (isDark ? '#6b7280' : '#9ca3af'), fontSize: 16 }}>
                {groupBy === 'site' ? '\u{1F4CD}' : groupBy === 'team' ? '\u{1F465}' : '\u{1F4DA}'}
              </span>
            </button>
          )}
          {/* Cards/Table toggle */}
          <button
            onClick={() => setDisplayMode((m) => (m === 'cards' ? 'table' : 'cards'))}
            className="h-10 w-10 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center"
          >
            <span style={{ color: displayMode === 'table' ? color : (isDark ? '#6b7280' : '#9ca3af'), fontSize: 16 }}>
              {displayMode === 'table' ? '\u{1F4F1}' : '\u{1F4CB}'}
            </span>
          </button>
        </div>
        <TaskFilters value={filter} onChange={handleFilterChange} color={color} counts={counts} />

        {displayMode === 'cards' ? (
          /* ── Card View ──────────────────────────────────────────── */
          <div className="pb-36">
            {sections.length === 0 ? (
              <EmptyState icon="clipboard-outline" title="No tasks" />
            ) : (
              sections.map((section) => (
                <div key={section.title}>
                  <div className="flex items-center gap-2 mb-2 mt-1">
                    {section.title === 'Overdue' && <span className="text-red-600 text-sm">!</span>}
                    {section.title === 'Stalled' && <span className="text-amber-600 text-sm">||</span>}
                    {section.title === 'Rework' && <span className="text-amber-600 text-sm">R</span>}
                    <span className={`text-xs font-semibold uppercase tracking-wider ${
                      section.title === 'Overdue' ? 'text-red-500' :
                      section.title === 'Stalled' ? 'text-amber-600' :
                      section.title === 'Rework' ? 'text-amber-600' : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      {section.title} · {section.data.length}
                    </span>
                  </div>
                  {section.data.map((item) => (
                    <TaskCard
                      key={item.id}
                      task={item}
                      onPress={() => goToDetail(item.id)}
                      stalledDays={
                        getStalledDays(item) >= stalledThreshold ? getStalledDays(item) : undefined
                      }
                    />
                  ))}
                  <div className="h-3" />
                </div>
              ))
            )}
          </div>
        ) : (
          /* ── Table View ─────────────────────────────────────────── */
          <div className="pb-36">
            <TaskTableHeader
              sortKey={tableSortKey}
              sortDir={tableSortDir}
              onSort={handleSort}
            />
            {visibleTableTasks.length === 0 ? (
              <EmptyState icon="clipboard-outline" title="No tasks" />
            ) : (
              visibleTableTasks.map((item, index) => (
                <TaskTableRow
                  key={item.id}
                  task={item}
                  role={state.role}
                  onPress={() => goToDetail(item.id)}
                  isLast={index === visibleTableTasks.length - 1 && sortedTasks.length <= tableVisibleCount}
                />
              ))
            )}
            {sortedTasks.length > tableVisibleCount && (
              <button
                onClick={() => setTableVisibleCount((c) => c + PAGE_SIZE)}
                className="flex items-center justify-center py-3 mt-1 gap-1 w-full"
              >
                <span className="text-xs font-medium" style={{ color }}>
                  Load more ({sortedTasks.length - tableVisibleCount} remaining)
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {isManager && (
        <button
          onClick={goToNew}
          className="fixed bottom-24 right-5 h-14 w-14 rounded-full flex items-center justify-center shadow-lg text-white text-2xl"
          style={{ backgroundColor: color }}
        >
          +
        </button>
      )}
    </div>
  );
}
