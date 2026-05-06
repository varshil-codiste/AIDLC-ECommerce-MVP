'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import * as authService from '../../lib/auth-service';
import { EmailField } from './EmailField';
import { ErrorBanner } from './ErrorBanner';
import { PasswordField } from './PasswordField';
import { SubmitButton } from './SubmitButton';

interface LoginFormProps {
  onError: (msg: string | null) => void;
  serverError: string | null;
}

export function LoginForm({ onError, serverError }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    onError(null);

    try {
      await authService.login(email, password);
      router.push('/chat');
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 429) {
        onError('Too many failed attempts. Please try again in 15 minutes.');
      } else {
        onError('Invalid email or password.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {serverError && <ErrorBanner message={serverError} />}
      <EmailField value={email} onChange={setEmail} disabled={loading} />
      <PasswordField value={password} onChange={setPassword} disabled={loading} />
      <SubmitButton loading={loading} />
    </form>
  );
}
