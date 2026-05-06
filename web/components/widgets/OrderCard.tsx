import type { WidgetIntent } from '@/lib/types/chat.types';

interface OrderItem {
  title: string;
  quantity: number;
  priceAtPurchaseCents: number;
}

interface OrderCardData {
  orderId: string;
  status: string;
  totalCents: number;
  currency: string;
  placedAt: string;
  items: OrderItem[];
  trackingNumber?: string;
  trackingCarrier?: string;
  cancelAction?: { intent: string };
  refundAction?: { intent: string };
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

function formatCents(cents: number) {
  return `₹${(cents / 100).toFixed(2)}`;
}

interface Props {
  data: Record<string, unknown>;
  onIntent?: (intent: WidgetIntent) => void;
}

export function OrderCard({ data, onIntent }: Props) {
  const d = data as unknown as OrderCardData;
  const { orderId, status, totalCents, placedAt, items, trackingNumber, trackingCarrier, cancelAction, refundAction } = d;

  return (
    <div data-testid="order-card-root" className="rounded border border-gray-200 p-3 text-sm space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-xs text-gray-500">#{orderId.slice(-8)}</span>
        <span
          data-testid="order-card-status"
          role="status"
          className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100"
        >
          {STATUS_LABELS[status] ?? status}
        </span>
      </div>

      <ul data-testid="order-card-items" className="text-xs text-gray-700 space-y-0.5">
        {items.map((item, i) => (
          <li key={i} data-testid={`order-card-item-${i}`}>
            {item.title} × {item.quantity} — {formatCents(item.priceAtPurchaseCents)}
          </li>
        ))}
      </ul>

      <div data-testid="order-card-total" className="text-xs font-semibold text-right">
        Total: {formatCents(totalCents)}
      </div>

      {placedAt && (
        <div className="text-xs text-gray-400">Placed: {new Date(placedAt).toLocaleDateString()}</div>
      )}

      {trackingNumber && (
        <div className="text-xs text-gray-500">
          Tracking: {trackingCarrier ? `${trackingCarrier} — ` : ''}{trackingNumber}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        {cancelAction && (
          <button
            data-testid="order-card-cancel-btn"
            onClick={() => onIntent?.({ intent: cancelAction.intent })}
            className="text-xs px-2 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-400"
          >
            Cancel
          </button>
        )}
        {refundAction && (
          <button
            data-testid="order-card-refund-btn"
            onClick={() => onIntent?.({ intent: refundAction.intent })}
            className="text-xs px-2 py-1 rounded border border-orange-300 text-orange-600 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-orange-400"
          >
            Refund
          </button>
        )}
      </div>
    </div>
  );
}
