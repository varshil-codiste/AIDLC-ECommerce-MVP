'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  content: string;
  streaming: boolean;
}

export function StreamingTokens({ content, streaming }: Props) {
  const [ariaText, setAriaText] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!streaming) {
      setAriaText(content);
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setAriaText(content), 500);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [content, streaming]);

  return (
    <span className="whitespace-pre-wrap break-words">
      {content}
      {streaming && <span className="animate-pulse ml-0.5">▌</span>}
      <span className="sr-only" aria-live="polite" aria-atomic="false">
        {ariaText}
      </span>
    </span>
  );
}
