import Image from 'next/image';
import type { WidgetIntent } from '@/lib/types/chat.types';

interface ProductCardData {
  productId: string;
  title: string;
  priceCents: number;
  currency: string;
  imageUrl?: string;
  stock?: number;
  variantId?: string;
}

interface Props {
  data: Record<string, unknown>;
  onIntent?: (intent: WidgetIntent) => void;
}

function formatCents(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 2 }).format(cents / 100);
}

function stockLabel(stock: number | undefined): { text: string; cls: string } | null {
  if (stock === undefined) return null;
  if (stock === 0) return { text: 'Out of Stock', cls: 'text-red-600 bg-red-50' };
  if (stock <= 5) return { text: 'Low Stock', cls: 'text-amber-600 bg-amber-50' };
  return { text: 'In Stock', cls: 'text-green-700 bg-green-50' };
}

export function ProductCard({ data, onIntent }: Props) {
  if (!data || !data['title']) return null;

  const d = data as unknown as ProductCardData;
  const badge = stockLabel(d.stock);

  return (
    <div data-testid="product-card-root" className="rounded border border-gray-200 p-4 text-sm space-y-3 max-w-xs">
      {d.imageUrl ? (
        <Image
          data-testid="product-card-image"
          src={d.imageUrl}
          alt={d.title}
          width={240}
          height={160}
          className="rounded object-cover w-full"
        />
      ) : null}

      <div>
        <div data-testid="product-card-title" className="font-semibold text-gray-900 leading-snug">
          {d.title}
        </div>

        <div className="flex items-center justify-between mt-1">
          <span data-testid="product-card-price" className="text-gray-700 font-medium">
            {formatCents(d.priceCents, d.currency)}
          </span>
          {badge ? (
            <span
              data-testid="product-card-stock"
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}
            >
              {badge.text}
            </span>
          ) : null}
        </div>
      </div>

      {d.variantId ? (
        <button
          data-testid="product-card-add-btn"
          className="w-full bg-gray-900 text-white rounded py-2 text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50"
          onClick={() => onIntent?.({ intent: 'cart.add', variantId: d.variantId as string })}
        >
          Add to cart
        </button>
      ) : null}
    </div>
  );
}
