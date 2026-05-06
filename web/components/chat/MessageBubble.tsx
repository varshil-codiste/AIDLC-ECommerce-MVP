import { clsx } from 'clsx';
import type { ChatMessage } from '@/lib/types/chat.types';
import { StreamingTokens } from './StreamingTokens';
import { WidgetRenderer } from '../widgets/WidgetRenderer';

interface Props {
  message: ChatMessage;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div
      className={clsx('flex', isUser ? 'justify-end' : 'justify-start')}
      data-testid={`message-bubble-${message.role}`}
    >
      <div
        className={clsx(
          'max-w-[80%] rounded-2xl px-4 py-2 text-sm',
          isUser
            ? 'bg-blue-600 text-white'
            : message.type === 'error'
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-gray-100 text-gray-900',
        )}
      >
        {message.type === 'widget' && message.widget ? (
          <WidgetRenderer widget={message.widget} />
        ) : (
          <StreamingTokens content={message.content} streaming={message.streaming} />
        )}
      </div>
    </div>
  );
}
