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

  // Auth gate: if no in-memory access token, kick to /login.
  // (The middleware checks the refresh cookie; we need the access token in memory to call the API.)
  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/login?returnTo=%2Fchat');
      return;
    }
    setAuthChecked(true);
  }, [router]);

  // Restore session on mount
  useEffect(() => {
    if (!authChecked) return;
    const saved = loadSession();
    if (saved.length > 0) {
      dispatch({ type: 'RESTORE_MESSAGES', messages: saved });
    }
  }, [authChecked]);

  // Persist messages on change
  useEffect(() => {
    if (state.messages.length > 0) {
      saveSession(state.messages);
    }
  }, [state.messages]);

  // Welcome message on first load — guarded against React StrictMode double-fire
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

  // Disconnect SSE on unmount
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
    try {
      await authLogout();
    } catch {
      // ignore — we'll clear local state anyway
    }
    if (typeof window !== 'undefined') sessionStorage.removeItem('chat_messages');
    router.replace('/login');
  }, [router]);

  if (!authChecked) {
    return <div className="flex items-center justify-center h-screen text-gray-500">Loading…</div>;
  }

  const user = getUser();

  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-900">Chat</h1>
        <div className="flex items-center gap-3 text-sm">
          {user ? <span className="text-gray-500">Signed in</span> : null}
          <button
            type="button"
            onClick={handleLogout}
            className="rounded border border-gray-300 px-3 py-1 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900"
            data-testid="logout-button"
          >
            Logout
          </button>
        </div>
      </header>
      <MessageList messages={state.messages} streaming={state.streaming} />
      <Composer disabled={state.composerDisabled} onSubmit={handleSubmit} />
    </div>
  );
}
