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

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  );
}

export function ProductCarousel({ data, onIntent }: Props) {
  const d = data as unknown as ProductCarouselData;
  const products = d.products ?? [];

  if (products.length === 0) {
    return (
      <div className="text-sm text-neutral-600 italic">
        No matches found{d.query ? ` for "${d.query}"` : ''}.
      </div>
    );
  }

  return (
    <div data-testid="product-carousel-root" className="space-y-4">
      {d.query ? (
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider">
          <span className="text-neutral-500">Results for</span>
          <span className="font-semibold text-neutral-900">&ldquo;{d.query}&rdquo;</span>
          <span className="text-neutral-300">·</span>
          <span className="text-neutral-500">{products.length} found</span>
        </div>
      ) : null}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {products.map((item, n) => (
          <button
            key={item.productId}
            data-testid={`product-carousel-item-${n}`}
            onClick={() => onIntent?.({ intent: 'product.view', productId: item.productId, productTitle: item.title })}
            className="group relative rounded-2xl border border-neutral-200 bg-white p-4 text-left transition hover:border-neutral-900 hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.15)] focus:outline-none focus:ring-2 focus:ring-neutral-900"
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs font-mono text-neutral-400 tracking-wider">
                {String(n + 1).padStart(2, '0')}
              </span>
              <span
                aria-hidden="true"
                className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center transition group-hover:bg-neutral-700"
              >
                <ArrowIcon />
              </span>
            </div>
            <ProductImage
              src={item.imageUrl}
              alt={item.title}
              className="w-full h-24 mb-3"
            />
            <div
              data-testid={`product-carousel-item-${n}-title`}
              className="text-sm font-semibold text-neutral-900 leading-tight line-clamp-2 mb-2 min-h-[2.5rem]"
            >
              {item.title}
            </div>
            <div className="text-base font-bold text-neutral-900 tabular-nums">
              {formatCents(item.priceCents, item.currency)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
