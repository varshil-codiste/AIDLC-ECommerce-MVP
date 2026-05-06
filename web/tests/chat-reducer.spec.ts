import { describe, it, expect, beforeEach, vi } from 'vitest';
import { chatReducer, initialChatState, saveSession, loadSession } from '../lib/chat-reducer';
import type { ChatSessionState, ChatMessage } from '../lib/types/chat.types';

const baseState = (): ChatSessionState => ({ ...initialChatState });

const makeMsg = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'test-id',
  role: 'assistant',
  type: 'text',
  content: 'hello',
  widget: null,
  streaming: false,
  timestamp: Date.now(),
  ...overrides,
});

describe('chatReducer', () => {
  it('ADD_USER_MESSAGE appends message and enables composerDisabled', () => {
    const state = chatReducer(baseState(), {
      type: 'ADD_USER_MESSAGE',
      id: 'u1',
      content: 'Hello',
    });
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0].role).toBe('user');
    expect(state.messages[0].content).toBe('Hello');
    expect(state.composerDisabled).toBe(true);
    expect(state.streaming).toBe(true);
  });

  it('START_STREAMING appends empty streaming assistant message', () => {
    const state = chatReducer(baseState(), { type: 'START_STREAMING', messageId: 'a1' });
    expect(state.messages[0].id).toBe('a1');
    expect(state.messages[0].streaming).toBe(true);
    expect(state.messages[0].content).toBe('');
  });

  it('APPEND_TOKEN accumulates onto last streaming message', () => {
    let state = chatReducer(baseState(), { type: 'START_STREAMING', messageId: 'a1' });
    state = chatReducer(state, { type: 'APPEND_TOKEN', delta: 'Hello' });
    state = chatReducer(state, { type: 'APPEND_TOKEN', delta: ' world' });
    expect(state.messages[0].content).toBe('Hello world');
  });

  it('APPEND_TOKEN is no-op when no streaming message exists', () => {
    const state = chatReducer(baseState(), { type: 'APPEND_TOKEN', delta: 'hi' });
    expect(state.messages).toHaveLength(0);
  });

  it('STREAMING_DONE clears streaming flag and re-enables composer', () => {
    let state = chatReducer(baseState(), { type: 'START_STREAMING', messageId: 'a1' });
    state = chatReducer(state, { type: 'STREAMING_DONE' });
    expect(state.streaming).toBe(false);
    expect(state.composerDisabled).toBe(false);
    expect(state.messages[0].streaming).toBe(false);
  });

  it('ADD_WIDGET appends widget message', () => {
    const widget = { type: 'product_card', data: { productId: 'p1', title: 'Shoe', priceUsd: 50 } };
    const state = chatReducer(baseState(), { type: 'ADD_WIDGET', id: 'w1', widget });
    expect(state.messages[0].type).toBe('widget');
    expect(state.messages[0].widget).toEqual(widget);
  });

  it('ADD_ERROR_MESSAGE appends error and re-enables composer', () => {
    const started = chatReducer(baseState(), { type: 'ADD_USER_MESSAGE', id: 'u1', content: 'hi' });
    const state = chatReducer(started, {
      type: 'ADD_ERROR_MESSAGE',
      id: 'e1',
      message: 'Connection lost.',
    });
    const errMsg = state.messages.find((m) => m.id === 'e1');
    expect(errMsg?.type).toBe('error');
    expect(state.composerDisabled).toBe(false);
  });

  it('SET_SSE_STATUS updates sseStatus', () => {
    const state = chatReducer(baseState(), { type: 'SET_SSE_STATUS', status: 'connected' });
    expect(state.sseStatus).toBe('connected');
  });

  it('RESTORE_MESSAGES replaces messages', () => {
    const msgs = [makeMsg({ id: 'r1' })];
    const state = chatReducer(baseState(), { type: 'RESTORE_MESSAGES', messages: msgs });
    expect(state.messages).toEqual(msgs);
  });
});

describe('saveSession / loadSession', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        for (const k in store) delete store[k];
      },
    });
  });

  it('round-trips messages through sessionStorage', () => {
    const msgs = [makeMsg({ id: 'p1' })];
    saveSession(msgs);
    expect(loadSession()).toEqual(msgs);
  });

  it('loadSession returns [] when storage is empty', () => {
    expect(loadSession()).toEqual([]);
  });
});
