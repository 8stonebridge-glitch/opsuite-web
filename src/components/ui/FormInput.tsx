'use client';

import * as React from 'react';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

interface FormInputProps extends React.ComponentProps<'input'> {
  label?: string;
  containerClassName?: string;
  onChangeText?: (text: string) => void;
}

function FormInput({ label, containerClassName = '', onChangeText, onChange, className, ...props }: FormInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeText?.(e.target.value);
    onChange?.(e);
  };

  return (
    <div className={containerClassName}>
      {label && (
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
          {label}
        </label>
      )}
      <Input
        className={cn('h-10 rounded-xl', className)}
        onChange={handleChange}
        {...props}
      />
    </div>
  );
}

export { FormInput };
