'use client';

import { useRouter } from 'next/navigation';
import { useApp } from '@/store/AppContext';

export default function HomePage() {
  const { state, dispatch } = useApp();
  const router = useRouter();

  const handleRoleSelect = (role: 'admin' | 'subadmin' | 'employee') => {
    const userIdMap: Record<string, string | null> = {
      admin: null,
      subadmin: state.teams?.[0]?.lead?.id || null,
      employee: state.teams?.[0]?.members?.[0]?.id || null,
    };

    dispatch({ type: 'SWITCH_USER', role, userId: userIdMap[role] });

    const pathMap: Record<string, string> = {
      admin: '/admin/overview',
      subadmin: '/subadmin/overview',
      employee: '/employee/my-day',
    };
    router.push(pathMap[role]);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            OpSuite
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Choose a role to get started
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => handleRoleSelect('admin')}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-600 transition-colors"
          >
            <div className="w-11 h-11 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-lg">
              👑
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Admin / Owner</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Full access to all teams, sites, and tasks</p>
            </div>
          </button>

          <button
            onClick={() => handleRoleSelect('subadmin')}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors"
          >
            <div className="w-11 h-11 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-lg">
              👥
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Subadmin / Team Lead</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Manage your team's tasks and check-ins</p>
            </div>
          </button>

          <button
            onClick={() => handleRoleSelect('employee')}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
          >
            <div className="w-11 h-11 rounded-full bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-lg">
              🧑‍💼
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Employee</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">View your tasks, check in daily</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
