import type { WidgetIntent } from '@/lib/types/chat.types';

interface NotificationItem {
  id: string;
  type: 'order.created' | 'low_stock';
  message: string;
  read: boolean;
  createdAt: string;
  payload?: Record<string, unknown>;
}

interface NotificationInboxData {
  notifications: NotificationItem[];
  unreadCount: number;
}

const TYPE_LABELS: Record<string, string> = {
  'order.created': 'New Order',
  low_stock: 'Low Stock',
};

interface Props {
  data: Record<string, unknown>;
  onIntent?: (intent: WidgetIntent) => void;
}

export function NotificationInbox({ data, onIntent }: Props) {
  const d = data as unknown as NotificationInboxData;
  const { notifications, unreadCount } = d;

  if (!notifications || notifications.length === 0) {
    return (
      <div data-testid="notification-inbox-root" className="rounded border border-gray-200 p-3 text-sm text-gray-500">
        <div data-testid="notification-inbox-empty">
          You&apos;re all caught up — no notifications right now.
        </div>
      </div>
    );
  }

  return (
    <div data-testid="notification-inbox-root" className="rounded border border-gray-200 p-3 text-sm space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">Notifications</span>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span
              data-testid="notification-inbox-count"
              className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-medium"
            >
              {unreadCount}
            </span>
          )}
          <button
            data-testid="notification-inbox-mark-all-btn"
            onClick={() => onIntent?.({ intent: 'notification.mark_all_read' })}
            className="text-xs text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400 rounded"
          >
            Mark all read
          </button>
        </div>
      </div>

      <ul className="space-y-1">
        {notifications.map((item, i) => (
          <li
            key={item.id}
            data-testid={`notification-item-${i}`}
            className="flex items-start gap-2 text-xs py-1"
          >
            {!item.read && (
              <span
                data-testid={`notification-item-${i}-unread`}
                className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500"
                aria-label="Unread"
              />
            )}
            {item.read && <span className="mt-1 shrink-0 w-1.5 h-1.5" />}
            <div className="flex-1 min-w-0">
              <span
                data-testid={`notification-item-${i}-type`}
                className="shrink-0 mr-1.5 px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium"
              >
                {TYPE_LABELS[item.type] ?? item.type}
              </span>
              <span className="text-gray-700">{item.message}</span>
            </div>
            <span className="shrink-0 text-gray-300">
              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
