import type { WidgetIntent } from '@/lib/types/chat.types';
import { ProductImage } from './ProductImage';

interface ProductPreview {
  productId: string;
  title: string;
  priceCents: number;
  currency: string;
  imageUrl?: string | null;
}

interface ProductCarouselData {
  products: ProductPreview[];
  query?: string;
  usedFallback?: boolean;
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

export function ProductCarousel({ data, onIntent }: Props) {
  const d = data as unknown as ProductCarouselData;
  const products = d.products ?? [];

  if (products.length === 0) {
    return (
      <div className="text-sm text-gray-600 italic">
        No matches found{d.query ? ` for "${d.query}"` : ''}.
      </div>
    );
  }

  return (
    <div data-testid="product-carousel-root" className="space-y-3">
      {d.query ? (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500">Results for</span>
          <span className="font-semibold text-gray-900">&ldquo;{d.query}&rdquo;</span>
          <span className="text-gray-400">·</span>
          <span className="text-gray-500">{products.length} found</span>
        </div>
      ) : null}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {products.map((item, n) => (
          <button
            key={item.productId}
            data-testid={`product-carousel-item-${n}`}
            onClick={() => onIntent?.({ intent: 'product.view', productId: item.productId })}
            className="group rounded-xl border border-gray-200 bg-white p-3 text-left transition hover:border-indigo-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <ProductImage
              src={item.imageUrl}
              alt={item.title}
              className="w-full h-28 mb-3"
            />
            <div
              data-testid={`product-carousel-item-${n}-title`}
              className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2 mb-1 group-hover:text-indigo-700"
            >
              {item.title}
            </div>
            <div className="text-sm font-bold text-gray-900">
              {formatCents(item.priceCents, item.currency)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
