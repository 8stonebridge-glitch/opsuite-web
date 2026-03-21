'use client';

import * as React from 'react';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

interface FormFieldProps extends React.ComponentProps<'input'> {
  /** Visible label text */
  label: string;
  /** Error message — triggers error styling when present */
  error?: string;
  /** Help text shown below the input */
  helpText?: string;
  /** Additional class for the outer wrapper */
  containerClassName?: string;
}

/**
 * Composable form field with label, input, error message, and help text.
 * Automatically links error/help to input via aria-describedby.
 */
function FormField({
  label,
  error,
  helpText,
  containerClassName,
  className,
  id: idProp,
  ...props
}: FormFieldProps) {
  const generatedId = React.useId();
  const id = idProp ?? generatedId;
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;

  const describedBy = [
    error ? errorId : undefined,
    helpText ? helpId : undefined,
  ]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', containerClassName)}>
      <label
        htmlFor={id}
        className="text-caption font-semibold text-muted-foreground uppercase tracking-wider"
      >
        {label}
      </label>
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'h-10 rounded-input',
          error && 'border-destructive ring-destructive/20 ring-3',
          className,
        )}
        {...props}
      />
      {error && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {helpText && (
        <p id={helpId} className="text-sm text-muted-foreground">
          {helpText}
        </p>
      )}
    </div>
  );
}

export { FormField };
export type { FormFieldProps };
