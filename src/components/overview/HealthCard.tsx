'use client';

import { type ReactNode } from 'react';
import { MapPin, Users, ChevronRight } from 'lucide-react';
import { useTheme } from '../../providers/ThemeProvider';
import { Card, CardContent } from '@/components/ui/Card';

export interface StatPill {
  label: string;
  value: number | string;
  color: string;
}

interface HealthCardProps {
  title: string;
  subtitle?: string;
  icon?: string;
  iconColor?: string;
  stats: StatPill[];
  onPress?: () => void;
  rightContent?: ReactNode;
}

const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  location: MapPin,
  map: MapPin,
  pin: MapPin,
  people: Users,
  users: Users,
  team: Users,
};

function getIcon(icon: string) {
  const key = icon.toLowerCase();
  return iconMap[key] ?? null;
}

export function HealthCard({ title, subtitle, icon, iconColor, stats, onPress, rightContent }: HealthCardProps) {
  const { isDark } = useTheme();

  return (
    <Card
      className={`w-full ${onPress ? 'cursor-pointer hover:shadow-sm transition-shadow' : ''}`}
      onClick={onPress}
    >
      <CardContent className="py-0">
        <div className="flex items-center gap-3 mb-3">
          {icon && (() => {
            const IconComponent = getIcon(icon);
            return (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: (iconColor || '#059669') + '12' }}
              >
                {IconComponent ? (
                  <IconComponent className="w-[18px] h-[18px]" style={{ color: iconColor || '#059669' }} />
                ) : (
                  <span className="text-title" style={{ color: iconColor || '#059669' }}>
                    {icon.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            );
          })()}
          <div className="flex-1 min-w-0">
            <span className="block text-caption text-surface-900 dark:text-surface-100 truncate font-semibold">{title}</span>
            {subtitle && <span className="block text-caption text-surface-400 dark:text-surface-500 truncate mt-0.5">{subtitle}</span>}
          </div>
          {rightContent}
          {onPress && (
            <ChevronRight className="h-4 w-4 text-surface-300 dark:text-surface-600 shrink-0" />
          )}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="rounded-lg py-2.5 px-2 flex flex-col items-center min-w-0"
              style={{ backgroundColor: stat.color + (isDark ? '15' : '08') }}
            >
              <span className="text-caption sm:text-heading tabular-nums truncate" style={{ color: stat.color }}>
                {stat.value}
              </span>
              <span className="text-[9px] sm:text-micro text-surface-400 dark:text-surface-500 uppercase tracking-wider mt-0.5 truncate max-w-full font-medium">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
