'use client';

import { useRouter } from 'next/navigation';
import { useApp } from '@/store/AppContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Crown, Users, UserCircle } from 'lucide-react';

const roles = [
  {
    key: 'admin' as const,
    label: 'Admin / Owner',
    description: 'Full access to all teams, sites, and tasks',
    icon: Crown,
    accent: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-100 dark:bg-emerald-900/40',
    ring: 'hover:ring-emerald-500/30',
  },
  {
    key: 'subadmin' as const,
    label: 'Subadmin / Team Lead',
    description: "Manage your team's tasks and check-ins",
    icon: Users,
    accent: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-100 dark:bg-indigo-900/40',
    ring: 'hover:ring-indigo-500/30',
  },
  {
    key: 'employee' as const,
    label: 'Employee',
    description: 'View your tasks, check in daily',
    icon: UserCircle,
    accent: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/40',
    ring: 'hover:ring-blue-500/30',
  },
] as const;

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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50/60 via-white to-white dark:from-emerald-950/20 dark:via-gray-950 dark:to-gray-950">
      <div className="w-full max-w-md px-6">
        {/* Branded header */}
        <div className="text-center mb-10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-600/20">
            <Crown className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-1">
            OpSuite
          </h1>
          <p className="text-sm text-muted-foreground">
            Choose a role to get started
          </p>
        </div>

        {/* Role cards */}
        <div className="flex flex-col gap-3">
          {roles.map(({ key, label, description, icon: Icon, accent, bg, ring }) => (
            <Card
              key={key}
              className={`cursor-pointer transition-all hover:ring-2 hover:shadow-md ${ring}`}
              onClick={() => handleRoleSelect(key)}
            >
              <CardContent className="flex items-center gap-4">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${bg}`}
                >
                  <Icon className={`h-5 w-5 ${accent}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
