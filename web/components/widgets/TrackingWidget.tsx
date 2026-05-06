interface TrackingEvent {
  label: string;
  timestamp: string;
  detail?: string;
}

interface TrackingWidgetData {
  orderId: string;
  status: string;
  trackingNumber?: string | null;
  trackingCarrier?: string | null;
  events: TrackingEvent[];
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  return_requested: 'Return Requested',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  confirmed: 'bg-blue-100 text-blue-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  refunded: 'bg-purple-100 text-purple-700',
  return_requested: 'bg-amber-100 text-amber-700',
};

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export function TrackingWidget({ data }: { data: Record<string, unknown> }) {
  const d = data as unknown as TrackingWidgetData;
  const statusLabel = STATUS_LABELS[d.status] ?? d.status;
  const statusColor = STATUS_COLORS[d.status] ?? 'bg-gray-100 text-gray-700';
  const orderIdSuffix = d.orderId.slice(-8);

  return (
    <div data-testid="tracking-widget-root" className="rounded border border-gray-200 p-3 text-sm space-y-2">
      <div className="flex items-center justify-between">
        <span data-testid="tracking-widget-order-id" className="font-medium">
          Order #{orderIdSuffix}
        </span>
        <span
          data-testid="tracking-widget-status"
          className={`text-xs px-2 py-0.5 rounded ${statusColor}`}
          aria-label={`Order status: ${statusLabel}`}
        >
          {statusLabel}
        </span>
      </div>

      {d.trackingNumber && (
        <div data-testid="tracking-widget-carrier" className="text-xs text-gray-600">
          {d.trackingCarrier ?? 'Carrier'} — {d.trackingNumber}
        </div>
      )}

      {d.events.length === 0 ? (
        <div
          data-testid="tracking-widget-empty"
          role="status"
          className="text-xs text-gray-500 py-2"
        >
          Tracking will appear here once your order ships.
        </div>
      ) : (
        <ol className="space-y-1.5 mt-2">
          {d.events.map((event, i) => (
            <li key={i} className="flex items-start gap-2 text-xs">
              <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <span data-testid={`tracking-widget-event-${i}-label`} className="font-medium text-gray-700">
                  {event.label}
                </span>
                {event.detail && <span className="text-gray-500 ml-2">{event.detail}</span>}
                <div data-testid={`tracking-widget-event-${i}-timestamp`} className="text-gray-400">
                  {formatTimestamp(event.timestamp)}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
