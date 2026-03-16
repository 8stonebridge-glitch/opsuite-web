'use client';

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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      {items.map((kpi, i) => (
        <button
          key={i}
          className="group relative bg-white dark:bg-surface-900 rounded-xl border border-surface-100 dark:border-surface-800 p-4 text-center transition-all hover:shadow-sm hover:border-surface-200 dark:hover:border-surface-700 active:scale-[0.98]"
          onClick={kpi.onClick}
          type="button"
        >
          <span
            className="block text-title lg:text-display tabular-nums"
            style={{ color: kpi.color }}
          >
            {kpi.value}
          </span>
          <span className="block text-micro lg:text-[11px] text-surface-400 dark:text-surface-500 mt-1 uppercase tracking-wider font-medium">
            {kpi.label}
          </span>
          {/* Accent bar */}
          <div
            className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full opacity-40"
            style={{ backgroundColor: kpi.color }}
          />
        </button>
      ))}
    </div>
  );
}
