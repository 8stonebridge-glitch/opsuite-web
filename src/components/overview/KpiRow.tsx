'use client';

import { Card, CardContent } from '@/components/ui/Card';

export interface KpiItem {
  label: string;
  value: number;
  color: string;
  onClick?: () => void;
}

interface KpiRowProps {
  items: KpiItem[];
}

export function KpiRow({ items }: KpiRowProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
      {items.map((kpi, i) => (
        <Card
          key={i}
          size="sm"
          className="cursor-pointer hover:bg-accent transition-colors"
          onClick={kpi.onClick}
        >
          <CardContent className="flex flex-col items-center py-0">
            <span className="text-2xl font-bold" style={{ color: kpi.color }}>
              {kpi.value}
            </span>
            <span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">
              {kpi.label}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
