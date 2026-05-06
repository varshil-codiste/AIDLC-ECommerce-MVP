'use client';

import { useState, useRef, type KeyboardEvent } from 'react';
import { clsx } from 'clsx';

interface Props {
  disabled: boolean;
  onSubmit: (message: string) => void;
}

export function Composer({ disabled, onSubmit }: Props) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setValue('');
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="px-4 sm:px-6 py-4 flex items-end gap-3">
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          aria-label="Type a message"
          placeholder={disabled ? 'Waiting for response…' : 'Ask me anything — products, cart, orders…'}
          className={clsx(
            'w-full resize-none rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition',
            'focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900',
            'disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400',
          )}
          data-testid="composer-textarea"
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        aria-label="Send message"
        aria-disabled={disabled}
        className={clsx(
          'inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-3 text-sm font-medium text-white transition',
          'hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-900',
          'disabled:cursor-not-allowed disabled:bg-neutral-300',
        )}
        data-testid="composer-send"
      >
        Send
        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
      </button>
    </div>
  );
}
