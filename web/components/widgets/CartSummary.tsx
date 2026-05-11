import type { WidgetIntent } from '@/lib/types/chat.types';
import { ProductImage } from './ProductImage';

interface CartItem {
  itemId: string;
  variantId: string;
  title: string;
  variantLabel: string;
  priceCents: number;
  currency: string;
  quantity: number;
  lineTotalCents: number;
  imageUrl?: string;
}

interface CartSummaryData {
  cartId: string;
  items: CartItem[];
  totalCents: number;
  currency: string;
  itemCount: number;
}

interface Props {
  data: Record<string, unknown>;
  onIntent?: (intent: WidgetIntent) => void;
}

function formatCents(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 0 }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

export function CartSummary({ data, onIntent }: Props) {
  const d = data as unknown as CartSummaryData;
  const { cartId, items, totalCents, currency, itemCount } = d;

  if (!items || items.length === 0) {
    return (
      <div data-testid="cart-summary-root" className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <p role="status" data-testid="cart-summary-empty" className="text-neutral-500 text-center text-sm">
          Your cart is empty
        </p>
      </div>
    );
  }

  return (
    <div data-testid="cart-summary-root" className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
      {/* Header — Codiste-style with numbered label */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-100 bg-neutral-50/50">
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-mono text-neutral-400 tracking-wider">CART</span>
        </div>
        <span data-testid="cart-summary-item-count" className="text-xs font-medium text-neutral-500 bg-white border border-neutral-200 rounded-full px-2.5 py-0.5">
          {itemCount} item{itemCount !== 1 ? 's' : ''}
        </span>
      </div>

      <ul className="divide-y divide-neutral-100">
        {items.map((item, n) => (
          <li key={item.itemId} data-testid={`cart-summary-item-${n}`} className="px-5 py-4 flex gap-3 items-start">
            <div data-testid={`cart-summary-item-${n}-image`} className="flex-shrink-0">
              <ProductImage src={item.imageUrl} alt={item.title} className="w-14 h-14" />
            </div>
            <div className="flex-1 min-w-0">
              <div data-testid={`cart-summary-item-${n}-title`} className="font-semibold text-neutral-900 truncate">
                {item.title}
              </div>
              <div className="text-xs text-neutral-500 mb-2">{item.variantLabel}</div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <button
                    data-testid={`cart-summary-item-${n}-qty-dec`}
                    className="w-7 h-7 rounded-full border border-neutral-300 flex items-center justify-center text-neutral-700 hover:border-neutral-900 hover:bg-neutral-900 hover:text-white transition focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    aria-label={`Decrease quantity of ${item.title}`}
                    onClick={() => {
                      if (item.quantity <= 1) {
                        onIntent?.({ intent: 'cart.remove', itemId: item.itemId, productTitle: item.title });
                      } else {
                        onIntent?.({ intent: 'cart.update_quantity', itemId: item.itemId, quantity: item.quantity - 1, productTitle: item.title });
                      }
                    }}
                  >
                    <span className="text-sm">−</span>
                  </button>
                  <span data-testid={`cart-summary-item-${n}-qty`} className="w-7 text-center text-sm font-semibold tabular-nums">
                    {item.quantity}
                  </span>
                  <button
                    data-testid={`cart-summary-item-${n}-qty-inc`}
                    className="w-7 h-7 rounded-full border border-neutral-300 flex items-center justify-center text-neutral-700 hover:border-neutral-900 hover:bg-neutral-900 hover:text-white transition focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    aria-label={`Increase quantity of ${item.title}`}
                    onClick={() => onIntent?.({ intent: 'cart.update_quantity', itemId: item.itemId, quantity: item.quantity + 1, productTitle: item.title })}
                  >
                    <span className="text-sm">+</span>
                  </button>
                </div>
                <div className="text-right">
                  <div data-testid={`cart-summary-item-${n}-price`} className="text-[11px] text-neutral-400">
                    {formatCents(item.priceCents, item.currency)} each
                  </div>
                  <div data-testid={`cart-summary-item-${n}-line-total`} className="font-semibold text-neutral-900 tabular-nums">
                    {formatCents(item.lineTotalCents, item.currency)}
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="px-5 py-4 border-t border-neutral-100 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">Total</span>
        <span data-testid="cart-summary-total" className="text-xl font-bold text-neutral-900 tabular-nums">
          {formatCents(totalCents, currency)}
        </span>
      </div>

      <div className="px-5 pb-5 flex gap-2">
        <button
          data-testid="cart-summary-checkout-btn"
          className="flex-1 inline-flex items-center justify-center gap-2 bg-neutral-900 text-white rounded-full py-2.5 text-sm font-medium hover:bg-neutral-700 transition focus:outline-none focus:ring-2 focus:ring-neutral-900"
          onClick={() => onIntent?.({ intent: 'cart.checkout', cartId })}
        >
          Checkout
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </button>
        <button
          data-testid="cart-summary-clear-btn"
          className="px-4 rounded-full border border-neutral-300 text-neutral-700 text-sm hover:border-neutral-900 hover:bg-neutral-50 transition focus:outline-none focus:ring-2 focus:ring-neutral-900"
          onClick={() => onIntent?.({ intent: 'cart.clear' })}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
