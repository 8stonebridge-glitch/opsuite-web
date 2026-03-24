'use client';

import { Loader2 } from 'lucide-react';
import type { EmailStepFormProps } from './sign-in-types';

export default function EmailStepForm({
  email,
  setEmail,
  error,
  loading,
  onSubmit,
}: EmailStepFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-caption font-medium text-surface-700 dark:text-surface-300 mb-1.5">
          Email address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          autoComplete="email"
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          required
          className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-caption text-surface-900 dark:text-surface-100 placeholder-surface-400 dark:placeholder-surface-500 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
        />
      </div>

      {error && (
        <p className="text-caption text-red-500 dark:text-red-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !email.trim()}
        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-caption font-semibold transition-colors flex items-center justify-center gap-2"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Continue
      </button>
    </form>
  );
}
