export default function RootLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-50 dark:bg-surface-950">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-surface-200 border-t-emerald-600 dark:border-surface-700 dark:border-t-emerald-400" />
        <p className="text-sm text-surface-400 dark:text-surface-500">Loading...</p>
      </div>
    </div>
  );
}
