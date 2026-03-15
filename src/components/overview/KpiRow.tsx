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
    <div className="flex gap-2">
      {items.map((kpi, i) => (
        <button
          key={i}
          onClick={kpi.onClick}
          className="flex-1 bg-white dark:bg-gray-900 rounded-2xl p-4 flex flex-col items-center border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
          type="button"
        >
          <span className="text-2xl font-bold" style={{ color: kpi.color }}>
            {kpi.value}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wider">
            {kpi.label}
          </span>
        </button>
      ))}
    </div>
  );
}
