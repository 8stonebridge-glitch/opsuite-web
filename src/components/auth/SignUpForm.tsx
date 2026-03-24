'use client';

import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { INPUT_CLASS, SUBMIT_BTN_CLASS } from './sign-up-constants';
import GoogleSSOButton from './GoogleSSOButton';

export interface SignUpFormProps {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  showPassword: boolean;
  loading: boolean;
  error: string;
  onFirstNameChange: (v: string) => void;
  onLastNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onTogglePassword: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onGoogle: () => void;
}

export default function SignUpForm(props: SignUpFormProps) {
  const {
    firstName, lastName, email, password, showPassword,
    loading, error,
    onFirstNameChange, onLastNameChange, onEmailChange,
    onPasswordChange, onTogglePassword, onSubmit, onGoogle,
  } = props;

  return (
    <>
      <h2 className="text-title text-surface-900 dark:text-surface-100 mb-1.5">Create admin account</h2>
      <p className="text-caption text-surface-500 dark:text-surface-400 mb-8">
        For organization owners setting up OpSuite. Staff accounts are created later by an admin.
      </p>

      <GoogleSSOButton onClick={onGoogle} label="Continue with Google as admin" />
      <Divider />

      <form onSubmit={onSubmit} className="space-y-4">
        <NameFields
          firstName={firstName}
          lastName={lastName}
          onFirstNameChange={onFirstNameChange}
          onLastNameChange={onLastNameChange}
        />
        <EmailField email={email} onChange={onEmailChange} />
        <PasswordField
          password={password}
          showPassword={showPassword}
          onChange={onPasswordChange}
          onToggle={onTogglePassword}
        />

        {error && <p className="text-caption text-red-500 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading || !email.trim() || !password || !firstName.trim() || !lastName.trim()}
          className={SUBMIT_BTN_CLASS}
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Create admin account
        </button>
      </form>

      <p className="text-micro text-surface-400 dark:text-surface-500 leading-relaxed">
        Employees and subadmins should use the main sign-in page with the email and password provided by their admin.
      </p>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Private sub-components                                            */
/* ------------------------------------------------------------------ */

function Divider() {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-surface-200 dark:bg-surface-800" />
      <span className="text-micro text-surface-400 dark:text-surface-500 font-medium">or</span>
      <div className="flex-1 h-px bg-surface-200 dark:bg-surface-800" />
    </div>
  );
}

function NameFields(props: {
  firstName: string;
  lastName: string;
  onFirstNameChange: (v: string) => void;
  onLastNameChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label htmlFor="firstName" className="block text-caption font-medium text-surface-700 dark:text-surface-300 mb-1.5">
          First name
        </label>
        <input
          id="firstName"
          type="text"
          value={props.firstName}
          onChange={(e) => props.onFirstNameChange(e.target.value)}
          placeholder="John"
          autoComplete="given-name"
          autoFocus
          required
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label htmlFor="lastName" className="block text-caption font-medium text-surface-700 dark:text-surface-300 mb-1.5">
          Last name
        </label>
        <input
          id="lastName"
          type="text"
          value={props.lastName}
          onChange={(e) => props.onLastNameChange(e.target.value)}
          placeholder="Doe"
          autoComplete="family-name"
          required
          className={INPUT_CLASS}
        />
      </div>
    </div>
  );
}

function EmailField(props: { email: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label htmlFor="email" className="block text-caption font-medium text-surface-700 dark:text-surface-300 mb-1.5">
        Email address
      </label>
      <input
        id="email"
        type="email"
        value={props.email}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder="you@company.com"
        autoComplete="email"
        required
        className={INPUT_CLASS}
      />
    </div>
  );
}

function PasswordField(props: {
  password: string;
  showPassword: boolean;
  onChange: (v: string) => void;
  onToggle: () => void;
}) {
  return (
    <div>
      <label htmlFor="password" className="block text-caption font-medium text-surface-700 dark:text-surface-300 mb-1.5">
        Password
      </label>
      <div className="relative">
        <input
          id="password"
          type={props.showPassword ? 'text' : 'password'}
          value={props.password}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder="Create a password"
          autoComplete="new-password"
          required
          className={`${INPUT_CLASS} pr-11`}
        />
        <button
          type="button"
          onClick={props.onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300"
        >
          {props.showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
