import { Zap, BarChart3, Bell } from 'lucide-react';

export const BENEFITS = [
  { icon: Zap, text: 'Set up your admin workspace in minutes' },
  { icon: BarChart3, text: 'Configure sites, teams, and reporting from day one' },
  { icon: Bell, text: 'Create staff accounts later from the People page' },
] as const;

export const POST_SIGN_UP_URL =
  process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL ||
  process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL ||
  process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL ||
  '/onboarding';

/** Shared Tailwind class string for form inputs. */
export const INPUT_CLASS =
  'w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-caption text-surface-900 dark:text-surface-100 placeholder-surface-400 dark:placeholder-surface-500 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors';

/** Shared Tailwind class string for primary submit buttons. */
export const SUBMIT_BTN_CLASS =
  'w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-caption font-semibold transition-colors flex items-center justify-center gap-2';
