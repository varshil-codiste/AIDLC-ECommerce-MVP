'use client';

import { useState } from 'react';

interface Props {
  src?: string | null;
  alt: string;
  className?: string;
  // Roughly square; sizes via CSS class
}

// Deterministic gradient palette per title — always renders cleanly even when
// the upstream image (placehold.co etc.) fails or is slow.
const GRADIENTS = [
  ['from-indigo-500', 'to-blue-600'],
  ['from-violet-500', 'to-fuchsia-600'],
  ['from-cyan-500', 'to-sky-600'],
  ['from-emerald-500', 'to-teal-600'],
  ['from-rose-500', 'to-pink-600'],
  ['from-amber-500', 'to-orange-600'],
  ['from-slate-700', 'to-gray-900'],
];

function pickGradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const [a, b] = GRADIENTS[h % GRADIENTS.length];
  return `bg-gradient-to-br ${a} ${b}`;
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
  const gradient = pickGradient(alt);

  return (
    <div className={`relative overflow-hidden rounded-lg ${gradient} ${className}`}>
      {!useFallback && src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setErrored(true)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : null}
      {useFallback ? (
        <div className="absolute inset-0 flex items-center justify-center text-white">
          <span className="text-xl font-semibold tracking-wide drop-shadow-sm">{initials(alt)}</span>
        </div>
      ) : null}
    </div>
  );
}
