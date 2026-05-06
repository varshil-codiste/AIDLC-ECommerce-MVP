'use client';

import { useReducer, useRef, useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { chatReducer, initialChatState, loadSession, saveSession } from '@/lib/chat-reducer';
import { SseClient } from '@/lib/sse-client';
import { getAccessToken, getUser, logout as authLogout } from '@/lib/auth-service';
import { MessageList } from '@/components/chat/MessageList';
import { Composer } from '@/components/chat/Composer';
import type { SseHandlers, WidgetPayload } from '@/lib/types/chat.types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

let _msgCounter = 0;
function nextId(): string {
  return `msg-${Date.now()}-${++_msgCounter}`;
}

function CodisteLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-full bg-white text-neutral-900 flex items-center justify-center font-bold text-sm tracking-tight">
        C
      </div>
      <div className="leading-tight">
        <div className="text-sm font-semibold text-white tracking-tight">Codiste Commerce</div>
        <div className="text-[11px] text-neutral-400">AI Shopping Studio</div>
      </div>
    </div>
  );
}

function PillButton({ children, onClick, variant = 'dark', testId }: { children: React.ReactNode; onClick: () => void; variant?: 'dark' | 'light'; testId?: string }) {
  const cls = variant === 'dark'
    ? 'bg-white text-neutral-900 hover:bg-neutral-100'
    : 'bg-neutral-900 text-white hover:bg-neutral-800';
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-white/40 ${cls}`}
    >
      {children}
    </button>
  );
}

export default function ChatPage() {
  const router = useRouter();
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const [authChecked, setAuthChecked] = useState(false);
  const sseRef = useRef(new SseClient());
  const streamingMsgIdRef = useRef<string | null>(null);
  const welcomeSentRef = useRef(false);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/login?returnTo=%2Fchat');
      return;
    }
    setAuthChecked(true);
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    const saved = loadSession();
    if (saved.length > 0) dispatch({ type: 'RESTORE_MESSAGES', messages: saved });
  }, [authChecked]);

  useEffect(() => {
    if (state.messages.length > 0) saveSession(state.messages);
  }, [state.messages]);

  useEffect(() => {
    if (!authChecked) return;
    if (welcomeSentRef.current) return;
    const saved = loadSession();
    if (saved.length > 0) return;
    const user = getUser();
    if (!user) return;
    welcomeSentRef.current = true;
    dispatch({
      type: 'ADD_ASSISTANT_TEXT',
      id: nextId(),
      content: "Hi — I'm your shopping assistant. What are you looking for today?",
    });
  }, [authChecked]);

  useEffect(() => {
    const sse = sseRef.current;
    return () => sse.disconnect();
  }, []);

  const handleSubmit = useCallback((text: string) => {
    const userMsgId = nextId();
    dispatch({ type: 'ADD_USER_MESSAGE', id: userMsgId, content: text });
    const streamingMsgId = nextId();
    streamingMsgIdRef.current = streamingMsgId;
    dispatch({ type: 'START_STREAMING', messageId: streamingMsgId });

    const token = getAccessToken();
    if (!token) {
      router.replace('/login?returnTo=%2Fchat');
      return;
    }
    const url = `${API_BASE}/api/v1/orchestrator/stream?message=${encodeURIComponent(text)}&token=${encodeURIComponent(token)}`;

    const handlers: SseHandlers = {
      onToken: (delta) => dispatch({ type: 'APPEND_TOKEN', delta }),
      onWidget: (widget: WidgetPayload) => dispatch({ type: 'ADD_WIDGET', id: nextId(), widget }),
      onDone: () => dispatch({ type: 'STREAMING_DONE' }),
      onError: (code, message) => {
        dispatch({ type: 'STREAMING_DONE' });
        dispatch({ type: 'ADD_ERROR_MESSAGE', id: nextId(), message });
        console.warn('SSE error', code, message);
      },
      onStatusChange: (status) => dispatch({ type: 'SET_SSE_STATUS', status }),
    };

    sseRef.current.disconnect();
    sseRef.current.connect(url, handlers);
  }, [router]);

  const handleLogout = useCallback(async () => {
    sseRef.current.disconnect();
    try { await authLogout(); } catch { /* ignore */ }
    if (typeof window !== 'undefined') sessionStorage.removeItem('chat_messages');
    router.replace('/login');
  }, [router]);

  if (!authChecked) {
    return <div className="flex items-center justify-center h-screen bg-neutral-50 text-neutral-500 text-sm">Loading…</div>;
  }

  const SUGGESTED = [
    'show me phones',
    'compare iPhone 15 Pro and Samsung Galaxy S24',
    'show me laptops under ₹1,00,000',
    'what categories do you have?',
  ];

  return (
    <div className="flex flex-col h-screen bg-neutral-50">
      {/* Dark Codiste-style header */}
      <header className="bg-neutral-900 text-white">
        <div className="mx-auto max-w-5xl px-6 py-3.5 flex items-center justify-between">
          <CodisteLogo />
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-neutral-400">Signed in</span>
            <PillButton onClick={handleLogout} variant="dark" testId="logout-button">
              Logout
              <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </PillButton>
          </div>
        </div>
      </header>

      {/* Conversation */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-hidden mx-auto max-w-5xl w-full px-3 sm:px-6">
          <MessageList messages={state.messages} streaming={state.streaming} />
        </div>
        {state.messages.length <= 1 && !state.streaming ? (
          <div className="mx-auto max-w-5xl w-full px-3 sm:px-6 pb-3">
            <div className="text-[11px] uppercase tracking-wider text-neutral-500 mb-2 font-semibold">Try one of these</div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED.map((p) => (
                <button
                  key={p}
                  onClick={() => handleSubmit(p)}
                  className="text-xs rounded-full border border-neutral-300 bg-white px-3.5 py-1.5 text-neutral-800 hover:border-neutral-900 hover:bg-neutral-900 hover:text-white transition"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Composer */}
      <div className="border-t border-neutral-200 bg-white">
        <div className="mx-auto max-w-5xl">
          <Composer disabled={state.composerDisabled} onSubmit={handleSubmit} />
        </div>
      </div>
    </div>
  );
}
