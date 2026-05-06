interface OrderRow {
  orderId: string;
  title?: string;
  result: 'success' | 'failed';
  error?: string;
}

interface OrderStatusUpdateData {
  updatedCount: number;
  failedCount: number;
  status: string;
  orders: OrderRow[];
}

interface Props {
  data: Record<string, unknown>;
}

export function OrderStatusUpdate({ data }: Props) {
  const d = data as unknown as OrderStatusUpdateData;
  const { updatedCount, failedCount, status, orders } = d;

  return (
    <div data-testid="order-status-update-root" className="rounded border border-gray-200 p-3 text-sm space-y-2">
      <div data-testid="order-status-update-summary" className="font-medium text-sm">
        {updatedCount > 0 && <span className="text-green-700">{updatedCount} updated to {status}</span>}
        {failedCount > 0 && (
          <span className="text-red-600 ml-2">{failedCount} failed</span>
        )}
      </div>

      <ul className="space-y-1">
        {orders.map((row, i) => (
          <li key={i} data-testid={`order-status-update-row-${i}`} className="flex items-center justify-between text-xs">
            <span className="text-gray-600 truncate">#{row.orderId.slice(-8)}{row.title ? ` — ${row.title}` : ''}</span>
            {row.result === 'success' ? (
              <span className="text-green-600 font-medium">✓</span>
            ) : (
              <span data-testid={`order-status-update-row-${i}-error`} role="status" className="text-red-600 font-medium">
                ✗{row.error ? ` ${row.error}` : ''}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
