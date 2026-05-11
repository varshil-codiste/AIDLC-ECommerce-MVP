interface EmailFieldProps {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

export function EmailField({ value, onChange, disabled }: EmailFieldProps) {
  return (
    <div>
      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
        Email
      </label>
      <input
        id="email"
        type="email"
        autoComplete="username"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 disabled:bg-gray-50 disabled:text-neutral-500"
        data-testid="login-form-email"
      />
    </div>
  );
}
