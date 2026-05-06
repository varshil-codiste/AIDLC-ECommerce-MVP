'use client';

import { useState } from 'react';
import { BrandHeader } from './BrandHeader';
import { LoginForm } from './LoginForm';

export function LoginPage() {
  const [serverError, setServerError] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-lg shadow p-8">
        <BrandHeader />
        <LoginForm serverError={serverError} onError={setServerError} />
      </div>
    </div>
  );
}
