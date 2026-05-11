import type { WidgetIntent } from '@/lib/types/chat.types';

interface PaymentItem {
  title: string;
  variantLabel: string;
  quantity: number;
  lineTotalCents: number;
}

interface Address {
  id?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
}

interface PaymentWidgetData {
  cartId: string;
  totalCents: number;
  currency: string;
  items: PaymentItem[];
  address?: Address | null;
}

interface Props {
  data: Record<string, unknown>;
  onIntent?: (intent: WidgetIntent) => void;
}

function formatCents(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 2 }).format(cents / 100);
}

export function PaymentWidget({ data, onIntent }: Props) {
  const d = data as unknown as PaymentWidgetData;
  const { cartId, totalCents, currency, items, address } = d;
  const hasAddress = !!address;

  return (
    <div data-testid="payment-widget-root" className="rounded border border-gray-200 p-4 text-sm space-y-3">
      <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Order Summary</div>

      <ul className="divide-y divide-gray-100">
        {items.map((item, n) => (
          <li key={n} data-testid={`payment-widget-item-${n}`} className="py-2 flex justify-between">
            <div>
              <div className="font-medium">{item.title}</div>
              <div className="text-xs text-gray-500">{item.variantLabel} × {item.quantity}</div>
            </div>
            <div className="font-medium">{formatCents(item.lineTotalCents, currency)}</div>
          </li>
        ))}
      </ul>

      <div className="border-t border-gray-200 pt-2">
        {hasAddress ? (
          <div data-testid="payment-widget-address" className="text-xs text-gray-600 space-y-0.5">
            <div className="font-medium text-gray-700 mb-1">Ship to</div>
            <div>{address!.line1}</div>
            {address!.line2 ? <div>{address!.line2}</div> : null}
            <div>{address!.city}, {address!.state} {address!.postalCode}</div>
            <div>{address!.countryCode}</div>
          </div>
        ) : (
          <div data-testid="payment-widget-no-address" className="text-xs text-amber-600 bg-amber-50 rounded p-2">
            No shipping address saved. Please provide your address to continue.
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 pt-2 flex items-center justify-between font-semibold">
        <span>Total</span>
        <span data-testid="payment-widget-total">{formatCents(totalCents, currency)}</span>
      </div>

      <button
        data-testid="payment-widget-pay-btn"
        disabled={!hasAddress}
        aria-disabled={!hasAddress}
        className="w-full bg-gray-900 text-white rounded py-2 text-sm font-medium hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
        onClick={() => hasAddress && onIntent?.({ intent: 'payment.confirm', cartId })}
      >
        Pay Now
      </button>
    </div>
  );
}
