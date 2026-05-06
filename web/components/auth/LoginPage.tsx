'use client';

import { useState } from 'react';
import { BrandHeader } from './BrandHeader';
import { LoginForm } from './LoginForm';

export function LoginPage() {
  const [serverError, setServerError] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl shadow-indigo-100/50 ring-1 ring-gray-100 p-8">
        <BrandHeader />
        <LoginForm serverError={serverError} onError={setServerError} />
        <div className="mt-6 pt-6 border-t border-gray-100 text-xs text-gray-500 space-y-1">
          <div className="font-semibold text-gray-700 mb-2">Demo accounts</div>
          <div><span className="text-gray-400">Shopper:</span> shopper@dev.local / shopper-dev-passw0rd!</div>
          <div><span className="text-gray-400">Merchant:</span> merchant@dev.local / merchant-dev-passw0rd!</div>
        </div>
      </div>
    </div>
  );
}
