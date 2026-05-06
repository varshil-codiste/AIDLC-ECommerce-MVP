'use client';

import { useReducer, useRef, useEffect, useCallback } from 'react';
import { chatReducer, initialChatState, loadSession, saveSession } from '@/lib/chat-reducer';
import { SseClient } from '@/lib/sse-client';
import { getAccessToken, getUser } from '@/lib/auth-service';
import { MessageList } from '@/components/chat/MessageList';
import { Composer } from '@/components/chat/Composer';
import type { SseHandlers, WidgetPayload } from '@/lib/types/chat.types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

let _msgCounter = 0;
function nextId(): string {
  return `msg-${Date.now()}-${++_msgCounter}`;
}

export default function ChatPage() {
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const sseRef = useRef(new SseClient());
  const streamingMsgIdRef = useRef<string | null>(null);

  // Restore session on mount
  useEffect(() => {
    const saved = loadSession();
    if (saved.length > 0) {
      dispatch({ type: 'RESTORE_MESSAGES', messages: saved });
    }
  }, []);

  // Persist messages on change
  useEffect(() => {
    if (state.messages.length > 0) {
      saveSession(state.messages);
    }
  }, [state.messages]);

  // Welcome message / merchant digest on first load
  useEffect(() => {
    const saved = loadSession();
    if (saved.length > 0) return;

    const user = getUser();
    if (!user) return;

    // Detect role from token claims via a cheap fetch to /api/v1/auth/me
    // For now, default to shopper welcome; role is set after session restore
    dispatch({
      type: 'ADD_ASSISTANT_TEXT',
      id: nextId(),
      content: "Hi! I'm your shopping assistant. What are you looking for today?",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const url = `${API_BASE}/api/v1/orchestrator/stream?message=${encodeURIComponent(text)}${token ? `&token=${encodeURIComponent(token)}` : ''}`;

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
  }, []);

  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="border-b border-gray-200 px-4 py-3 flex items-center">
        <h1 className="text-base font-semibold text-gray-900">Chat</h1>
      </header>
      <MessageList messages={state.messages} streaming={state.streaming} />
      <Composer disabled={state.composerDisabled} onSubmit={handleSubmit} />
    </div>
  );
}
