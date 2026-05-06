import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageList } from '../components/chat/MessageList';
import type { ChatMessage } from '../lib/types/chat.types';

const makeMsg = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'msg-1',
  role: 'assistant',
  type: 'text',
  content: 'Hello world',
  widget: null,
  streaming: false,
  timestamp: Date.now(),
  ...overrides,
});

describe('MessageList', () => {
  it('renders messages', () => {
    const msgs = [
      makeMsg({ id: 'a', content: 'Hello' }),
      makeMsg({ id: 'b', role: 'user', content: 'How are you?' }),
    ];
    render(<MessageList messages={msgs} streaming={false} />);
    // StreamingTokens renders content in both visible span and sr-only span
    expect(screen.getAllByText('Hello').length).toBeGreaterThan(0);
    expect(screen.getAllByText('How are you?').length).toBeGreaterThan(0);
  });

  it('has aria-live="polite" attribute', () => {
    render(<MessageList messages={[]} streaming={false} />);
    const list = screen.getByTestId('message-list');
    expect(list).toHaveAttribute('aria-live', 'polite');
  });

  it('has aria-busy="true" while streaming', () => {
    render(<MessageList messages={[]} streaming={true} />);
    const list = screen.getByTestId('message-list');
    expect(list).toHaveAttribute('aria-busy', 'true');
  });

  it('shows TypingIndicator while streaming', () => {
    render(<MessageList messages={[]} streaming={true} />);
    expect(screen.getByRole('status', { name: /typing/i })).toBeInTheDocument();
  });

  it('does not show TypingIndicator when not streaming', () => {
    render(<MessageList messages={[]} streaming={false} />);
    expect(screen.queryByRole('status', { name: /typing/i })).toBeNull();
  });
});
