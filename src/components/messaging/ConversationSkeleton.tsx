export function ConversationSkeleton() {
  return (
    <div className="space-y-1 p-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-surface-200 dark:bg-surface-700 shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-3.5 w-1/3 rounded bg-surface-200 dark:bg-surface-700" />
            <div className="h-3 w-2/3 rounded bg-surface-100 dark:bg-surface-800" />
          </div>
          <div className="h-2.5 w-10 rounded bg-surface-100 dark:bg-surface-800" />
        </div>
      ))}
    </div>
  );
}
