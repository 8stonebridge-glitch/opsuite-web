export default function RootLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-50 dark:bg-surface-950">
      <div className="flex flex-col items-center gap-3">
        <p className="text-lg font-semibold text-surface-900 dark:text-surface-100">OpSuite</p>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-surface-200 border-t-emerald-600 dark:border-surface-700 dark:border-t-emerald-400" />
      </div>
    </div>
  );
}
