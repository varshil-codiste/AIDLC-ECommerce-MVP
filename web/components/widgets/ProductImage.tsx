'use client';

import { useState } from 'react';

interface Props {
  src?: string | null;
  alt: string;
  className?: string;
}

// Monochrome / charcoal palette matching the Codiste aesthetic — dark cards with
// subtle warm accents instead of saturated rainbow gradients.
const PALETTES = [
  { from: 'from-neutral-900', to: 'to-neutral-700' },
  { from: 'from-stone-800', to: 'to-stone-600' },
  { from: 'from-zinc-900', to: 'to-zinc-700' },
  { from: 'from-slate-900', to: 'to-slate-700' },
  { from: 'from-neutral-800', to: 'to-stone-600' },
];

function pickPalette(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTES[h % PALETTES.length];
}

function initials(name: string): string {
  const words = name.replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/).slice(0, 2);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function ProductImage({ src, alt, className = 'w-full h-32' }: Props) {
  const [errored, setErrored] = useState(false);
  const useFallback = !src || errored;
  const { from, to } = pickPalette(alt);

  const bgClass = useFallback ? `bg-gradient-to-br ${from} ${to}` : 'bg-neutral-100';

  return (
    <div className={`relative overflow-hidden rounded-lg ${bgClass} ${className}`}>
      {!useFallback && src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setErrored(true)}
          className="absolute inset-0 w-full h-full object-contain"
        />
      ) : null}
      {useFallback ? (
        <div className="absolute inset-0 flex items-center justify-center text-white">
          <span className="text-xl font-semibold tracking-wide">{initials(alt)}</span>
        </div>
      ) : null}
      {/* Codiste-style geometric accent — subtle */}
      {useFallback && (
        <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full bg-white/5" />
      )}
    </div>
  );
}
