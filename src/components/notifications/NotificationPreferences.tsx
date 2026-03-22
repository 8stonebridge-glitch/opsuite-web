'use client';

import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convexApi';
import { Card, CardContent } from '@/components/ui/Card';
import { Bell, CheckSquare, Calendar, Hand, Shield, AlertCircle, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type NotificationType = 'task' | 'availability' | 'handoff' | 'coverage' | 'review' | 'system';

const PREF_ITEMS: { key: NotificationType; label: string; description: string; icon: LucideIcon }[] = [
  { key: 'task', label: 'Tasks', description: 'Assignments, approvals, and status changes', icon: CheckSquare },
  { key: 'review', label: 'Reviews', description: 'Verification and rework requests', icon: AlertCircle },
  { key: 'handoff', label: 'Handoffs', description: 'Daily handoff reminders', icon: Hand },
  { key: 'availability', label: 'Availability', description: 'Leave request approvals and rejections', icon: Calendar },
  { key: 'coverage', label: 'Coverage', description: 'Shift coverage alerts', icon: Shield },
  { key: 'system', label: 'System', description: 'Account and security updates', icon: Settings },
];

export function NotificationPreferences() {
  const prefs = useQuery(api.notifications.getPreferences);
  const updatePrefs = useMutation(api.notifications.updatePreferences);

  if (!prefs) return null;

  const toggle = (key: NotificationType) => {
    updatePrefs({ ...prefs, [key]: !prefs[key] });
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        <Bell className="size-4 text-surface-400" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">
          Notification Preferences
        </span>
      </div>
      <Card>
        <CardContent className="py-0 divide-y divide-surface-100 dark:divide-surface-800">
          {PREF_ITEMS.map(({ key, label, description, icon: Icon }) => (
            <div key={key} className="flex items-center justify-between py-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <Icon className="size-4 text-surface-400 dark:text-surface-500 shrink-0" />
                <div className="min-w-0">
                  <span className="text-caption font-medium text-surface-900 dark:text-surface-100 block">
                    {label}
                  </span>
                  <span className="text-[12px] text-surface-400 dark:text-surface-500 block truncate">
                    {description}
                  </span>
                </div>
              </div>
              <button
                onClick={() => toggle(key)}
                role="switch"
                aria-checked={prefs[key]}
                aria-label={`${label} notifications`}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                  prefs[key]
                    ? 'bg-emerald-500'
                    : 'bg-surface-200 dark:bg-surface-700'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform mt-0.5 ${
                    prefs[key] ? 'translate-x-5.5 ml-0.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
