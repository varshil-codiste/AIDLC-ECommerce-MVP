'use client';

import { useState } from 'react';

interface PasswordFieldProps {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

export function PasswordField({ value, onChange, disabled }: PasswordFieldProps) {
  const [show, setShow] = useState(false);

  return (
    <div>
      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
        Password
      </label>
      <div className="relative">
        <input
          id="password"
          type={show ? 'text' : 'password'}
          autoComplete="current-password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
          data-testid="login-form-password"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600"
          aria-label={show ? 'Hide password' : 'Show password'}
          data-testid="login-form-password-toggle"
        >
          {show ? '🙈' : '👁'}
        </button>
      </div>
    </div>
  );
}
