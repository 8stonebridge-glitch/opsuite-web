export default function SignInLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-50 dark:bg-surface-950">
      <div className="w-full max-w-sm mx-auto px-4">
        <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-lg p-8 space-y-6">
          {/* Title placeholder */}
          <div className="space-y-2 text-center">
            <div className="h-6 w-32 bg-surface-200 dark:bg-surface-700 rounded animate-pulse mx-auto" />
            <div className="h-4 w-48 bg-surface-100 dark:bg-surface-800 rounded animate-pulse mx-auto" />
          </div>
          {/* Email field placeholder */}
          <div className="space-y-2">
            <div className="h-3 w-16 bg-surface-200 dark:bg-surface-700 rounded animate-pulse" />
            <div className="h-10 w-full bg-surface-100 dark:bg-surface-800 rounded-lg animate-pulse" />
          </div>
          {/* Password field placeholder */}
          <div className="space-y-2">
            <div className="h-3 w-20 bg-surface-200 dark:bg-surface-700 rounded animate-pulse" />
            <div className="h-10 w-full bg-surface-100 dark:bg-surface-800 rounded-lg animate-pulse" />
          </div>
          {/* Button placeholder */}
          <div className="h-10 w-full bg-emerald-200 dark:bg-emerald-900/30 rounded-lg animate-pulse" />
          {/* Divider */}
          <div className="h-px w-full bg-surface-100 dark:bg-surface-800" />
          {/* SSO placeholder */}
          <div className="h-10 w-full bg-surface-100 dark:bg-surface-800 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
}
