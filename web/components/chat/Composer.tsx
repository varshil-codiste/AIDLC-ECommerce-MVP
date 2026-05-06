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
    <div className="border-t border-gray-200 px-4 py-3 flex items-end gap-2 bg-white">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={1}
        aria-label="Type a message"
        placeholder={disabled ? 'Waiting for response…' : 'Type a message…'}
        className={clsx(
          'flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none',
          'focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
          'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400',
        )}
        data-testid="composer-textarea"
      />
      <button
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        aria-label="Send message"
        aria-disabled={disabled}
        className={clsx(
          'rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white',
          'hover:bg-blue-700 transition-colors',
          'disabled:cursor-not-allowed disabled:bg-gray-300',
        )}
        data-testid="composer-send"
      >
        Send
      </button>
    </div>
  );
}
