import type { ChatAction, ChatMessage, ChatSessionState } from './types/chat.types';

const SESSION_STORAGE_KEY = 'chat_messages';

export const initialChatState: ChatSessionState = {
  messages: [],
  streaming: false,
  composerDisabled: false,
  role: null,
  error: null,
  sseStatus: 'idle',
};

export function chatReducer(state: ChatSessionState, action: ChatAction): ChatSessionState {
  switch (action.type) {
    case 'ADD_USER_MESSAGE': {
      const msg: ChatMessage = {
        id: action.id,
        role: 'user',
        type: 'text',
        content: action.content,
        widget: null,
        streaming: false,
        timestamp: Date.now(),
      };
      return {
        ...state,
        messages: [...state.messages, msg],
        streaming: true,
        composerDisabled: true,
      };
    }

    case 'START_STREAMING': {
      const msg: ChatMessage = {
        id: action.messageId,
        role: 'assistant',
        type: 'text',
        content: '',
        widget: null,
        streaming: true,
        timestamp: Date.now(),
      };
      return { ...state, messages: [...state.messages, msg] };
    }

    case 'APPEND_TOKEN': {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (!last || !last.streaming) return state;
      msgs[msgs.length - 1] = { ...last, content: last.content + action.delta };
      return { ...state, messages: msgs };
    }

    case 'ADD_WIDGET': {
      const msg: ChatMessage = {
        id: action.id,
        role: 'assistant',
        type: 'widget',
        content: '',
        widget: action.widget,
        streaming: false,
        timestamp: Date.now(),
      };
      return { ...state, messages: [...state.messages, msg] };
    }

    case 'STREAMING_DONE': {
      const msgs = state.messages.map((m) => (m.streaming ? { ...m, streaming: false } : m));
      return { ...state, messages: msgs, streaming: false, composerDisabled: false };
    }

    case 'ADD_ASSISTANT_TEXT': {
      const msg: ChatMessage = {
        id: action.id,
        role: 'assistant',
        type: 'text',
        content: action.content,
        widget: null,
        streaming: false,
        timestamp: Date.now(),
      };
      return { ...state, messages: [...state.messages, msg] };
    }

    case 'ADD_ERROR_MESSAGE': {
      const msg: ChatMessage = {
        id: action.id,
        role: 'assistant',
        type: 'error',
        content: action.message,
        widget: null,
        streaming: false,
        timestamp: Date.now(),
      };
      return {
        ...state,
        messages: [...state.messages, msg],
        streaming: false,
        composerDisabled: false,
      };
    }

    case 'SET_SSE_STATUS':
      return { ...state, sseStatus: action.status };

    case 'SET_ROLE':
      return { ...state, role: action.role };

    case 'RESTORE_MESSAGES':
      return { ...state, messages: action.messages };

    default:
      return state;
  }
}

export function saveSession(messages: ChatMessage[]): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // sessionStorage quota exceeded — silent
  }
}

export function loadSession(): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}
