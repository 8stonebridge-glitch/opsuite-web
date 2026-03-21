export function MessageSkeleton() {
  return (
    <div className="flex-1 space-y-4 p-4 animate-pulse">
      {/* Incoming message */}
      <div className="flex items-end gap-2 max-w-[75%]">
        <div className="w-7 h-7 rounded-full bg-surface-200 dark:bg-surface-700 shrink-0" />
        <div className="space-y-1">
          <div className="h-3 w-16 rounded bg-surface-200 dark:bg-surface-700" />
          <div className="h-10 w-48 rounded-2xl bg-surface-100 dark:bg-surface-800" />
        </div>
      </div>
      {/* Outgoing message */}
      <div className="flex items-end gap-2 max-w-[75%] ml-auto flex-row-reverse">
        <div className="space-y-1 items-end flex flex-col">
          <div className="h-10 w-40 rounded-2xl bg-surface-200 dark:bg-surface-700" />
        </div>
      </div>
      {/* Incoming message */}
      <div className="flex items-end gap-2 max-w-[75%]">
        <div className="w-7 h-7 rounded-full bg-surface-200 dark:bg-surface-700 shrink-0" />
        <div className="space-y-1">
          <div className="h-3 w-20 rounded bg-surface-200 dark:bg-surface-700" />
          <div className="h-16 w-56 rounded-2xl bg-surface-100 dark:bg-surface-800" />
        </div>
      </div>
      {/* Outgoing */}
      <div className="flex items-end gap-2 max-w-[75%] ml-auto flex-row-reverse">
        <div className="space-y-1 items-end flex flex-col">
          <div className="h-8 w-32 rounded-2xl bg-surface-200 dark:bg-surface-700" />
        </div>
      </div>
    </div>
  );
}
