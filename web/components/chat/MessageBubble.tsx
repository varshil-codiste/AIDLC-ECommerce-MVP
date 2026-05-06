import { clsx } from 'clsx';
import type { ChatMessage } from '@/lib/types/chat.types';
import { StreamingTokens } from './StreamingTokens';
import { WidgetRenderer } from '../widgets/WidgetRenderer';

interface Props {
  message: ChatMessage;
}

function AssistantAvatar() {
  return (
    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-sm">
      <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
      </svg>
    </div>
  );
}

function UserAvatar() {
  return (
    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center">
      <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-gray-600" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a7.5 7.5 0 0 1 15 0v.75H4.5v-.75Z" />
      </svg>
    </div>
  );
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';
  const isWidget = message.type === 'widget' && message.widget;
  const isError = message.type === 'error';

  return (
    <div
      className={clsx('flex gap-3 items-start', isUser ? 'justify-end' : 'justify-start')}
      data-testid={`message-bubble-${message.role}`}
    >
      {!isUser && <AssistantAvatar />}
      <div
        className={clsx(
          'text-sm leading-relaxed',
          isWidget ? 'max-w-[88%] sm:max-w-[80%] flex-1' : 'max-w-[85%] sm:max-w-[78%]',
          isUser
            ? 'rounded-2xl rounded-tr-sm bg-gradient-to-br from-indigo-600 to-violet-600 text-white px-4 py-2.5 shadow-sm'
            : isError
              ? 'rounded-2xl rounded-tl-sm bg-red-50 border border-red-200 text-red-700 px-4 py-2.5'
              : isWidget
                ? '' // widget renders its own card; no outer bubble
                : 'rounded-2xl rounded-tl-sm bg-white border border-gray-200 text-gray-800 px-4 py-2.5 shadow-sm',
        )}
      >
        {isWidget ? (
          <WidgetRenderer widget={message.widget!} />
        ) : (
          <StreamingTokens content={message.content} streaming={message.streaming} />
        )}
      </div>
      {isUser && <UserAvatar />}
    </div>
  );
}
