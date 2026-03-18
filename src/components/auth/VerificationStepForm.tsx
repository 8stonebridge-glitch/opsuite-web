'use client';

import { Loader2 } from 'lucide-react';
import type { VerificationStepFormProps } from './sign-in-types';

export default function VerificationStepForm({
  verificationTarget,
  verificationCode,
  setVerificationCode,
  error,
  loading,
  onBack,
  onSubmit,
}: VerificationStepFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="text-caption text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 mb-1 flex items-center gap-1"
      >
        &larr; Back
      </button>

      <div>
        <h3 className="text-caption font-semibold text-surface-900 dark:text-surface-100 mb-1.5">
          Verify this sign-in
        </h3>
        <p className="text-caption text-surface-500 dark:text-surface-400">
          Enter the code sent to{' '}
          <span className="font-medium text-surface-700 dark:text-surface-300">{verificationTarget}</span>
          {' '}to finish signing in.
        </p>
      </div>

      <div>
        <label htmlFor="verificationCode" className="block text-caption font-medium text-surface-700 dark:text-surface-300 mb-1.5">
          Verification code
        </label>
        <input
          id="verificationCode"
          type="text"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value)}
          placeholder="Enter code"
          autoComplete="one-time-code"
          autoFocus
          required
          className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-caption text-surface-900 dark:text-surface-100 placeholder-surface-400 dark:placeholder-surface-500 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors text-center tracking-[0.3em] text-lg font-mono"
        />
      </div>

      {error && (
        <p className="text-caption text-red-500 dark:text-red-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !verificationCode.trim()}
        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-caption font-semibold transition-colors flex items-center justify-center gap-2"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Verify & continue
      </button>
    </form>
  );
}
