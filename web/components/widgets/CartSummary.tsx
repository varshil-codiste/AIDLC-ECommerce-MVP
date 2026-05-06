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
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 2 }).format(cents / 100);
}

export function CartSummary({ data, onIntent }: Props) {
  const d = data as unknown as CartSummaryData;
  const { cartId, items, totalCents, currency, itemCount } = d;

  if (!items || items.length === 0) {
    return (
      <div data-testid="cart-summary-root" className="rounded border border-gray-200 p-4 text-sm space-y-3">
        <p role="status" data-testid="cart-summary-empty" className="text-gray-500 text-center py-4">
          Your cart is empty
        </p>
      </div>
    );
  }

  return (
    <div data-testid="cart-summary-root" className="rounded border border-gray-200 p-4 text-sm space-y-3">
      <div className="flex items-center justify-between text-xs text-gray-500 font-medium uppercase tracking-wide">
        <span>Cart</span>
        <span data-testid="cart-summary-item-count">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
      </div>

      <ul className="divide-y divide-gray-100">
        {items.map((item, n) => (
          <li key={item.itemId} data-testid={`cart-summary-item-${n}`} className="py-2 flex gap-3">
            <div data-testid={`cart-summary-item-${n}-image`} className="flex-shrink-0">
              <ProductImage src={item.imageUrl} alt={item.title} className="w-12 h-12" />
            </div>
            <div className="flex-1 min-w-0">
              <div data-testid={`cart-summary-item-${n}-title`} className="font-medium truncate">
                {item.title}
              </div>
              <div className="text-xs text-gray-500">{item.variantLabel}</div>
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-1">
                  <button
                    data-testid={`cart-summary-item-${n}-qty-dec`}
                    className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400"
                    aria-label={`Decrease quantity of ${item.title}`}
                    onClick={() => {
                      if (item.quantity <= 1) {
                        onIntent?.({ intent: 'cart.remove', itemId: item.itemId });
                      } else {
                        onIntent?.({ intent: 'cart.update_quantity', itemId: item.itemId, quantity: item.quantity - 1 });
                      }
                    }}
                  >
                    −
                  </button>
                  <span data-testid={`cart-summary-item-${n}-qty`} className="w-6 text-center text-xs font-medium">
                    {item.quantity}
                  </span>
                  <button
                    data-testid={`cart-summary-item-${n}-qty-inc`}
                    className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400"
                    aria-label={`Increase quantity of ${item.title}`}
                    onClick={() => onIntent?.({ intent: 'cart.update_quantity', itemId: item.itemId, quantity: item.quantity + 1 })}
                  >
                    +
                  </button>
                </div>
                <div className="text-right">
                  <div data-testid={`cart-summary-item-${n}-price`} className="text-xs text-gray-400">
                    {formatCents(item.priceCents, item.currency)} each
                  </div>
                  <div data-testid={`cart-summary-item-${n}-line-total`} className="font-medium">
                    {formatCents(item.lineTotalCents, item.currency)}
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="border-t border-gray-200 pt-2 flex items-center justify-between font-semibold">
        <span>Total</span>
        <span data-testid="cart-summary-total">{formatCents(totalCents, currency)}</span>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          data-testid="cart-summary-checkout-btn"
          className="flex-1 bg-gray-900 text-white rounded py-2 text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
          onClick={() => onIntent?.({ intent: 'cart.checkout', cartId })}
        >
          Checkout
        </button>
        <button
          data-testid="cart-summary-clear-btn"
          className="px-3 rounded border border-gray-300 text-gray-600 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
          onClick={() => onIntent?.({ intent: 'cart.clear' })}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
