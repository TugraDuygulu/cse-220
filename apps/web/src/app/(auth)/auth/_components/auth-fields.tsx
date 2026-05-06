'use client';

import { useId, useState } from 'react';
import { Input } from 'ui-common';
import {
  RiEyeLine,
  RiEyeOffLine,
  RiLockLine,
  RiMailLine,
} from '@remixicon/react';

type BaseFieldProps = {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
  required?: boolean;
};

export function EmailField({
  id,
  label = 'Email address',
  value,
  onChange,
  placeholder = 'you@example.com',
  disabled,
  autoComplete = 'email',
  autoFocus,
  required = true,
}: BaseFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="text-xs font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <RiMailLine
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id={inputId}
          type="email"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="pl-9"
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
        />
      </div>
    </div>
  );
}

export function PasswordField({
  id,
  label = 'Password',
  value,
  onChange,
  placeholder = 'Enter your password',
  disabled,
  autoComplete = 'current-password',
  required = true,
  minLength,
}: BaseFieldProps & { minLength?: number }) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="text-xs font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <RiLockLine
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id={inputId}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="pl-9 pr-9"
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          minLength={minLength}
        />
        <button
          type="button"
          onClick={() => setShowPassword((current) => !current)}
          className="absolute top-1/2 right-3 -translate-y-1/2 rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          disabled={disabled}
        >
          {showPassword ? (
            <RiEyeOffLine className="size-4" aria-hidden="true" />
          ) : (
            <RiEyeLine className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}
