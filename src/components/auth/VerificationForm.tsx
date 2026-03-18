'use client';

import { Loader2 } from 'lucide-react';
import { INPUT_CLASS, SUBMIT_BTN_CLASS } from './sign-up-constants';

export interface VerificationFormProps {
  email: string;
  verificationCode: string;
  loading: boolean;
  error: string;
  onCodeChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function VerificationForm(props: VerificationFormProps) {
  const { email, verificationCode, loading, error, onCodeChange, onSubmit } = props;

  return (
    <>
      <h2 className="text-title text-surface-900 dark:text-surface-100 mb-1.5">Verify your email</h2>
      <p className="text-caption text-surface-500 dark:text-surface-400 mb-8">
        We sent an admin verification code to{' '}
        <span className="font-medium text-surface-700 dark:text-surface-300">{email}</span>
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="code" className="block text-caption font-medium text-surface-700 dark:text-surface-300 mb-1.5">
            Verification code
          </label>
          <input
            id="code"
            type="text"
            value={verificationCode}
            onChange={(e) => onCodeChange(e.target.value)}
            placeholder="Enter 6-digit code"
            autoFocus
            required
            className={`${INPUT_CLASS} text-center tracking-[0.3em] text-lg font-mono`}
          />
        </div>

        {error && <p className="text-caption text-red-500 dark:text-red-400">{error}</p>}

        <button type="submit" disabled={loading || !verificationCode} className={SUBMIT_BTN_CLASS}>
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Verify &amp; continue
        </button>
      </form>
    </>
  );
}
