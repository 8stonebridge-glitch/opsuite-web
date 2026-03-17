export default function EmployeeLoading() {
  return (
    <div className="flex-1 bg-surface-50 dark:bg-surface-950 min-h-screen">
      <div className="bg-white dark:bg-surface-900 border-b border-surface-100 dark:border-surface-800">
        <div className="px-5 py-5">
          <div className="h-4 w-20 bg-surface-200 dark:bg-surface-700 rounded animate-pulse" />
          <div className="h-6 w-40 bg-surface-200 dark:bg-surface-700 rounded animate-pulse mt-2" />
        </div>
      </div>
      <div className="px-5 pt-5 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-white dark:bg-surface-900 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
