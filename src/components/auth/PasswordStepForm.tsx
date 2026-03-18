'use client';

import { Eye, EyeOff, Loader2 } from 'lucide-react';
import type { PasswordStepFormProps } from './sign-in-types';

export default function PasswordStepForm({
  email,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  error,
  loading,
  onBack,
  onSubmit,
}: PasswordStepFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="text-caption text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 mb-1 flex items-center gap-1"
      >
        &larr; {email}
      </button>

      <div>
        <label htmlFor="password" className="block text-caption font-medium text-surface-700 dark:text-surface-300 mb-1.5">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            autoFocus
            required
            className="w-full px-4 py-3 pr-11 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-caption text-surface-900 dark:text-surface-100 placeholder-surface-400 dark:placeholder-surface-500 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-caption text-red-500 dark:text-red-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !password}
        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-caption font-semibold transition-colors flex items-center justify-center gap-2"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Sign in
      </button>
    </form>
  );
}
