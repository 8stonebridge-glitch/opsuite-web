'use client';

import { useState, useMemo, useCallback, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SearchInput } from '../ui/SearchInput';
import { TaskFilters, type FilterValue } from './TaskFilters';
import { TaskCardView } from './TaskCardView';
import { TaskTableView } from './TaskTableView';
import { useApp } from '../../store/AppContext';
import {
  useScopedTasks,
  useMyAssignedTasks,
  useIndustryColor,
  useTeams,
} from '../../store/selectors';
import { isOverdue } from '../../utils/date';
import { consecutiveNoChangeWorkdays, compareTasks } from '../../utils/task-helpers';
import { buildTaskSections } from '../../utils/taskSections';
import { useTheme } from '../../providers/ThemeProvider';
import type { Task } from '../../types';

type GroupBy = 'status' | 'site' | 'team';
type DisplayMode = 'cards' | 'table';

interface TaskListScreenProps {
  basePath: string;
}

const PAGE_SIZE = 20;

// ── Component ──────────────────────────────────────────────────────────

export function TaskListScreen(props: TaskListScreenProps) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-surface-400">Loading...</div>}>
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

  const searched = useMemo(() => {
    if (!search) return baseTasks;
    const q = search.toLowerCase();
    return baseTasks.filter((t) =>
      `${t.title}${t.site}${t.assignee}${t.category || ''}${t.status}`.toLowerCase().includes(q)
    );
  }, [baseTasks, search]);

  const counts = useMemo(() => ({
    active: searched.filter((t) => t.status === 'Open' || t.status === 'In Progress').length,
    review: searched.filter((t) => t.status === 'Pending Approval' || t.status === 'Submitted').length,
    done: searched.filter((t) => t.status === 'Verified').length,
  }), [searched]);

  const filteredTasks = useMemo(() => {
    if (filter === 'active') return searched.filter((t) => t.status === 'Open' || t.status === 'In Progress');
    if (filter === 'review') return searched.filter((t) => t.status === 'Pending Approval' || t.status === 'Submitted');
    if (filter === 'done') return searched.filter((t) => t.status === 'Verified');
    return [];
  }, [searched, filter]);

  const sections = useMemo(
    () => buildTaskSections(filteredTasks, filter, groupBy, teams, stalledThreshold, state.audit, state.availability),
    [filteredTasks, filter, groupBy, teams, stalledThreshold, state.audit, state.availability]
  );

  const sortedTasks = useMemo(() => {
    const sorted = [...filteredTasks];
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

  const goToDetail = (id: string) => router.push(`${basePath}/${id}`);
  const goToNew = () => router.push(`${basePath}/new`);

  return (
    <div className="flex-1 bg-surface-50 dark:bg-surface-950 min-h-screen">
      <div className="flex-1 px-5 pt-3">
        {isManager && (
          <ScopeToggle
            scope={scope}
            myCount={myAssigned.length}
            allCount={allScoped.length}
            onSelectAssigned={() => { setScope('assigned'); setFilter('active'); setTableVisibleCount(PAGE_SIZE); }}
            onSelectAll={() => { setScope('all'); setFilter('active'); setTableVisibleCount(PAGE_SIZE); }}
          />
        )}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <SearchInput value={search} onChangeText={handleSearchChange} />
          </div>
          {displayMode === 'cards' && state.role === 'admin' && (
            <button
              onClick={() => {
                const next: GroupBy =
                  groupBy === 'status' ? 'site' : groupBy === 'site' ? 'team' : 'status';
                setGroupBy(next);
              }}
              className="h-10 w-10 rounded-xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 flex items-center justify-center"
            >
              <span style={{ color: groupBy !== 'status' ? color : (isDark ? '#6b7280' : '#9ca3af'), fontSize: 16 }}>
                {groupBy === 'site' ? '\u{1F4CD}' : groupBy === 'team' ? '\u{1F465}' : '\u{1F4DA}'}
              </span>
            </button>
          )}
          <button
            onClick={() => setDisplayMode((m) => (m === 'cards' ? 'table' : 'cards'))}
            className="h-10 w-10 rounded-xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 flex items-center justify-center"
          >
            <span style={{ color: displayMode === 'table' ? color : (isDark ? '#6b7280' : '#9ca3af'), fontSize: 16 }}>
              {displayMode === 'table' ? '\u{1F4F1}' : '\u{1F4CB}'}
            </span>
          </button>
        </div>
        <TaskFilters value={filter} onChange={handleFilterChange} color={color} counts={counts} />
        <div className="pb-24 md:pb-36">
          {displayMode === 'cards' ? (
            <TaskCardView
              sections={sections}
              stalledThreshold={stalledThreshold}
              getStalledDays={getStalledDays}
              onPress={goToDetail}
            />
          ) : (
            <TaskTableView
              visibleTasks={visibleTableTasks}
              totalCount={sortedTasks.length}
              visibleCount={tableVisibleCount}
              sortKey={tableSortKey}
              sortDir={tableSortDir}
              role={state.role}
              color={color}
              onSort={handleSort}
              onPress={goToDetail}
              onLoadMore={() => setTableVisibleCount((c) => c + PAGE_SIZE)}
            />
          )}
        </div>
      </div>
      {isManager && (
        <button
          onClick={goToNew}
          className="fixed bottom-24 md:bottom-8 right-5 h-14 w-14 rounded-full flex items-center justify-center shadow-lg text-white text-2xl"
          style={{ backgroundColor: color }}
        >
          +
        </button>
      )}
    </div>
  );
}

// ── ScopeToggle ────────────────────────────────────────────────────────

function ScopeToggle({
  scope, myCount, allCount, onSelectAssigned, onSelectAll,
}: {
  scope: 'assigned' | 'all';
  myCount: number;
  allCount: number;
  onSelectAssigned: () => void;
  onSelectAll: () => void;
}) {
  return (
    <div className="flex rounded-card bg-surface-200 dark:bg-surface-800 p-1 mb-4">
      <button
        onClick={onSelectAssigned}
        className={`flex-1 py-2.5 rounded-xl text-center ${scope === 'assigned' ? 'bg-white dark:bg-surface-900 shadow-sm' : ''}`}
      >
        <span className={`text-caption ${scope === 'assigned' ? 'text-surface-900 dark:text-surface-100' : 'text-surface-500 dark:text-surface-400'}`}>
          My Assigned{' '}
          <span className="text-surface-400 dark:text-surface-500 font-normal">{myCount}</span>
        </span>
      </button>
      <button
        onClick={onSelectAll}
        className={`flex-1 py-2.5 rounded-xl text-center ${scope === 'all' ? 'bg-white dark:bg-surface-900 shadow-sm' : ''}`}
      >
        <span className={`text-caption ${scope === 'all' ? 'text-surface-900 dark:text-surface-100' : 'text-surface-500 dark:text-surface-400'}`}>
          All Tasks{' '}
          <span className="text-surface-400 dark:text-surface-500 font-normal">{allCount}</span>
        </span>
      </button>
    </div>
  );
}
