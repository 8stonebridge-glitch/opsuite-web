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
      className={`w-full ${onPress ? 'cursor-pointer hover:bg-accent transition-colors' : ''}`}
      onClick={onPress}
    >
      <CardContent className="py-0">
        <div className="flex items-center gap-3 mb-3">
          {icon && (() => {
            const IconComponent = getIcon(icon);
            return (
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: (iconColor || '#059669') + '15' }}
              >
                {IconComponent ? (
                  <IconComponent className="w-4 h-4" style={{ color: iconColor || '#059669' }} />
                ) : (
                  <span className="text-lg" style={{ color: iconColor || '#059669' }}>
                    {icon.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            );
          })()}
          <div className="flex-1">
            <span className="block text-sm font-semibold text-foreground">{title}</span>
            {subtitle && <span className="block text-xs text-muted-foreground">{subtitle}</span>}
          </div>
          {rightContent}
          {onPress && (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        <div className="flex gap-2">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="flex-1 rounded-xl py-2 px-2 flex flex-col items-center"
              style={{ backgroundColor: stat.color + (isDark ? '20' : '10') }}
            >
              <span className="text-base font-bold" style={{ color: stat.color }}>
                {stat.value}
              </span>
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
