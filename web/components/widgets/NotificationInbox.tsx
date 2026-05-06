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
      <div data-testid="notification-inbox-root" className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-neutral-900 text-white flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0" />
          </svg>
        </div>
        <div data-testid="notification-inbox-empty">
          <div className="text-sm font-semibold text-neutral-900">All caught up</div>
          <div className="text-xs text-neutral-500">No notifications right now.</div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="notification-inbox-root" className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-mono text-neutral-400 tracking-wider">NOTIFICATIONS</span>
          {unreadCount > 0 && (
            <span
              data-testid="notification-inbox-count"
              className="text-[10px] bg-neutral-900 text-white px-2 py-0.5 rounded-full font-semibold"
            >
              {unreadCount} new
            </span>
          )}
        </div>
        <button
          data-testid="notification-inbox-mark-all-btn"
          onClick={() => onIntent?.({ intent: 'notification.mark_all_read' })}
          className="text-xs font-medium text-neutral-700 hover:text-neutral-900 underline-offset-2 hover:underline focus:outline-none"
        >
          Mark all read
        </button>
      </div>

      <ul className="divide-y divide-neutral-100">
        {notifications.map((item, i) => (
          <li
            key={item.id}
            data-testid={`notification-item-${i}`}
            className="flex items-start gap-3 px-5 py-3 hover:bg-neutral-50"
          >
            <span
              data-testid={`notification-item-${i}-unread`}
              className={`mt-1.5 shrink-0 w-2 h-2 rounded-full ${item.read ? 'bg-neutral-200' : 'bg-neutral-900'}`}
              aria-label={item.read ? 'Read' : 'Unread'}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  data-testid={`notification-item-${i}-type`}
                  className="shrink-0 px-2 py-0.5 rounded-full bg-neutral-900 text-white text-[10px] font-semibold uppercase tracking-wider"
                >
                  {TYPE_LABELS[item.type] ?? item.type}
                </span>
                <span className="shrink-0 text-[11px] text-neutral-400">
                  {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="text-sm text-neutral-700">{item.message}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
