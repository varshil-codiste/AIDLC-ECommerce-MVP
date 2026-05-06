import type { WidgetIntent } from '@/lib/types/chat.types';
import { OrderCard } from './OrderCard';

interface BulkAction {
  label: string;
  intent: string;
}

interface OrderListData {
  orders: Record<string, unknown>[];
  totalCount: number;
  bulkActions?: BulkAction[];
}

interface Props {
  data: Record<string, unknown>;
  onIntent?: (intent: WidgetIntent) => void;
}

export function OrderList({ data, onIntent }: Props) {
  const d = data as unknown as OrderListData;
  const { orders, totalCount, bulkActions } = d;

  return (
    <div data-testid="order-list-root" className="space-y-2">
      <div data-testid="order-list-count" className="text-xs text-gray-500 font-medium">
        {totalCount} order{totalCount !== 1 ? 's' : ''}
      </div>

      {bulkActions && bulkActions.length > 0 && (
        <div className="flex gap-2">
          {bulkActions.map((action, i) => (
            <button
              key={i}
              data-testid={`order-list-bulk-${action.intent}`}
              aria-label={action.label}
              onClick={() => onIntent?.({ intent: action.intent })}
              className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      <ul className="space-y-2">
        {orders.map((order, i) => (
          <li key={i} data-testid={`order-list-item-${i}`}>
            <OrderCard data={order} onIntent={onIntent} />
          </li>
        ))}
      </ul>
    </div>
  );
}
