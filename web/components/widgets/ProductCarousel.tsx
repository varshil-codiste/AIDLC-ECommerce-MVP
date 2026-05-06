import Image from 'next/image';
import type { WidgetIntent } from '@/lib/types/chat.types';

interface ProductPreview {
  productId: string;
  title: string;
  priceCents: number;
  currency: string;
  imageUrl?: string;
}

interface ProductCarouselData {
  products: ProductPreview[];
  query?: string;
}

interface Props {
  data: Record<string, unknown>;
  onIntent?: (intent: WidgetIntent) => void;
}

function formatCents(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 2 }).format(cents / 100);
}

export function ProductCarousel({ data, onIntent }: Props) {
  const d = data as unknown as ProductCarouselData;
  const products = d.products ?? [];

  if (products.length === 0) return null;

  return (
    <div data-testid="product-carousel-root" className="space-y-2">
      {d.query ? (
        <div className="text-xs text-gray-500 font-medium">Results for "{d.query}"</div>
      ) : null}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {products.map((item, n) => (
          <button
            key={item.productId}
            data-testid={`product-carousel-item-${n}`}
            className="flex-shrink-0 w-36 rounded border border-gray-200 p-2 text-left hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-900"
            onClick={() => onIntent?.({ intent: 'product.view', productId: item.productId })}
          >
            {item.imageUrl ? (
              <Image
                src={item.imageUrl}
                alt={item.title}
                width={128}
                height={96}
                className="rounded object-cover w-full mb-2"
              />
            ) : (
              <div className="w-full h-24 bg-gray-100 rounded mb-2 flex items-center justify-center text-gray-300 text-xs">
                No image
              </div>
            )}
            <div
              data-testid={`product-carousel-item-${n}-title`}
              className="text-xs font-medium text-gray-900 leading-tight line-clamp-2"
            >
              {item.title}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {formatCents(item.priceCents, item.currency)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
