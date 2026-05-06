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
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
        data-testid="login-form-email"
      />
    </div>
  );
}
