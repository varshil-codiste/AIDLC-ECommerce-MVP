'use client';

import { useState } from 'react';
import { BrandHeader } from './BrandHeader';
import { LoginForm } from './LoginForm';

export function LoginPage() {
  const [serverError, setServerError] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex bg-neutral-50">
      {/* Left: brand panel — Codiste-style dark hero */}
      <div className="hidden lg:flex lg:w-1/2 bg-neutral-900 text-white relative overflow-hidden">
        {/* Geometric accent — concentric rings echoing Codiste's hero */}
        <div className="absolute -right-32 -top-32 w-[500px] h-[500px] rounded-full border border-white/10" />
        <div className="absolute -right-20 -top-20 w-[400px] h-[400px] rounded-full border border-white/10" />
        <div className="absolute -right-8 -top-8 w-[300px] h-[300px] rounded-full border border-white/10" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white text-neutral-900 flex items-center justify-center font-bold text-sm">
              C
            </div>
            <span className="font-semibold tracking-tight">Codiste</span>
          </div>

          <div>
            <div className="text-[11px] font-mono text-neutral-400 tracking-widest mb-3">COMMERCE STUDIO</div>
            <h2 className="text-4xl font-bold tracking-tight leading-tight mb-4">
              The AI Shopping<br />Assistant your<br />customers will love.
            </h2>
            <p className="text-sm text-neutral-400 max-w-md leading-relaxed">
              Conversational commerce for shoppers and merchants — built on a multi-agent orchestrator with native tool use, semantic search, and live SSE streaming.
            </p>
          </div>

          <div className="text-xs text-neutral-500">
            © {new Date().getFullYear()} Codiste · AI-DLC MVP
          </div>
        </div>
      </div>

      {/* Right: login form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <BrandHeader />
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
            <LoginForm serverError={serverError} onError={setServerError} />
          </div>
          <div className="mt-5 rounded-2xl border border-neutral-200 bg-white p-4 text-xs text-neutral-600">
            <div className="text-[11px] font-mono text-neutral-400 tracking-widest mb-2">DEMO ACCOUNTS</div>
            <div className="space-y-1">
              <div className="flex justify-between"><span className="font-medium">Shopper</span><code className="text-neutral-500">shopper@dev.local</code></div>
              <div className="flex justify-between"><span className="font-medium">Merchant</span><code className="text-neutral-500">merchant@dev.local</code></div>
              <div className="text-neutral-400 mt-1">Password: <code>{'<role>'}-dev-passw0rd!</code></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
