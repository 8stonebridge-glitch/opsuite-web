import type { useSignIn } from '@clerk/nextjs';

export type SignInResource = NonNullable<ReturnType<typeof useSignIn>['signIn']>;

export interface SignInFormProps {
  error: string;
  loading: boolean;
}

export interface EmailStepFormProps extends SignInFormProps {
  email: string;
  setEmail: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export interface PasswordStepFormProps extends SignInFormProps {
  email: string;
  password: string;
  setPassword: (val: string) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export interface VerificationStepFormProps extends SignInFormProps {
  verificationTarget: string;
  verificationCode: string;
  setVerificationCode: (val: string) => void;
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
}
