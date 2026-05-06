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
    if (saved.length > 0) {
      dispatch({ type: 'RESTORE_MESSAGES', messages: saved });
    }
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
      content: "Hi! I'm your shopping assistant. What are you looking for today?",
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

  const handlePromptClick = useCallback((prompt: string) => {
    handleSubmit(prompt);
  }, [handleSubmit]);

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="text-gray-500 text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-sm">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
              </svg>
            </div>
            <div>
              <div className="text-base font-semibold text-gray-900 leading-tight">Codiste Commerce</div>
              <div className="text-xs text-gray-500">AI-powered shopping assistant</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-gray-200 bg-white px-3.5 py-1.5 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            data-testid="logout-button"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Message area + suggested prompts */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-hidden mx-auto max-w-4xl w-full px-2 sm:px-6">
          <MessageList messages={state.messages} streaming={state.streaming} />
        </div>
        {state.messages.length <= 1 && !state.streaming ? (
          <div className="mx-auto max-w-4xl w-full px-2 sm:px-6 pb-2">
            <div className="flex flex-wrap gap-2">
              {['show me phones', 'compare iPhone 15 Pro and Samsung Galaxy S24', 'show me laptops', 'what categories do you have?'].map((p) => (
                <button
                  key={p}
                  onClick={() => handlePromptClick(p)}
                  className="text-xs rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Composer */}
      <div className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-4xl">
          <Composer disabled={state.composerDisabled} onSubmit={handleSubmit} />
        </div>
      </div>
    </div>
  );
}
