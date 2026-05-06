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
      <div data-testid="notification-inbox-root" className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-sm text-emerald-700 flex items-center gap-2">
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
        <div data-testid="notification-inbox-empty">You&apos;re all caught up — no notifications right now.</div>
      </div>
    );
  }

  return (
    <div data-testid="notification-inbox-root" className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-transparent">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-indigo-600" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31" />
          </svg>
          <span className="font-semibold text-sm text-gray-900">Notifications</span>
          {unreadCount > 0 && (
            <span
              data-testid="notification-inbox-count"
              className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full font-semibold"
            >
              {unreadCount}
            </span>
          )}
        </div>
        <button
          data-testid="notification-inbox-mark-all-btn"
          onClick={() => onIntent?.({ intent: 'notification.mark_all_read' })}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-2 py-1"
        >
          Mark all read
        </button>
      </div>

      <ul className="divide-y divide-gray-100">
        {notifications.map((item, i) => (
          <li
            key={item.id}
            data-testid={`notification-item-${i}`}
            className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50"
          >
            <span
              data-testid={`notification-item-${i}-unread`}
              className={`mt-1.5 shrink-0 w-2 h-2 rounded-full ${item.read ? 'bg-gray-200' : 'bg-indigo-500'}`}
              aria-label={item.read ? 'Read' : 'Unread'}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  data-testid={`notification-item-${i}-type`}
                  className="shrink-0 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold"
                >
                  {TYPE_LABELS[item.type] ?? item.type}
                </span>
                <span className="shrink-0 text-xs text-gray-400">
                  {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="text-sm text-gray-700">{item.message}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
