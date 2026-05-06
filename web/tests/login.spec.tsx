import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginForm } from '../components/auth/LoginForm';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('../lib/auth-service', () => ({
  login: vi.fn(),
}));

import * as authService from '../lib/auth-service';

describe('LoginForm', () => {
  const onError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email, password and submit with correct data-testids', () => {
    render(<LoginForm serverError={null} onError={onError} />);

    expect(screen.getByTestId('login-form-email')).toBeTruthy();
    expect(screen.getByTestId('login-form-password')).toBeTruthy();
    expect(screen.getByTestId('login-form-submit')).toBeTruthy();
  });

  it('shows error banner when serverError is set', () => {
    render(<LoginForm serverError="Invalid email or password." onError={onError} />);

    expect(screen.getByTestId('login-form-error-banner')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe('Invalid email or password.');
  });

  it('submit button shows aria-busy while submitting', async () => {
    let resolveLogin!: () => void;
    (authService.login as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise<void>((res) => {
        resolveLogin = res;
      }),
    );

    render(<LoginForm serverError={null} onError={onError} />);

    fireEvent.change(screen.getByTestId('login-form-email'), { target: { value: 'x@y.com' } });
    fireEvent.change(screen.getByTestId('login-form-password'), {
      target: { value: 'passw0rd-twelve!' },
    });
    fireEvent.submit(screen.getByTestId('login-form-submit').closest('form')!);

    await waitFor(() => {
      expect(screen.getByTestId('login-form-submit').getAttribute('aria-busy')).toBe('true');
    });

    resolveLogin();
  });
});
