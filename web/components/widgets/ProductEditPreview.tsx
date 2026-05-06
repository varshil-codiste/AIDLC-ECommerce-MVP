'use client';

import { ProductFieldRow } from './ProductFieldRow';
import type { WidgetIntent } from '@/lib/types/chat.types';

interface DiffEntry {
  field: string;
  from: unknown;
  to: unknown;
}

interface ProductData {
  id?: string;
  title: string;
  priceCents: number;
  currency?: string;
  stock: number;
  description?: string;
  categoryId?: string;
  imageUrls?: string[];
}

interface ProductEditPreviewData {
  mode: 'create' | 'update';
  product: ProductData;
  diff?: DiffEntry[];
  missingFields?: string[];
  confirmAction: { intent: string };
  editMoreAction?: { intent: string };
}

interface Props {
  data: Record<string, unknown>;
  onIntent?: (intent: WidgetIntent) => void;
}

function formatPrice(priceCents: number, currency = 'INR') {
  const symbol = currency === 'INR' ? '₹' : '$';
  return `${symbol}${(priceCents / 100).toFixed(2)}`;
}

export function ProductEditPreview({ data, onIntent }: Props) {
  const d = data as unknown as ProductEditPreviewData;
  const { product, diff = [], missingFields = [], confirmAction, editMoreAction, mode } = d;

  const getDiff = (field: string) => diff.find((e) => e.field === field);

  return (
    <div
      data-testid="product-edit-preview-root"
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          {mode === 'create' ? 'New Product Preview' : 'Update Preview'}
        </span>
        {missingFields.length > 0 && (
          <span
            data-testid="product-edit-preview-missing-notice"
            className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded"
            role="status"
          >
            {missingFields.length} field{missingFields.length > 1 ? 's' : ''} missing
          </span>
        )}
      </div>

      <div className="space-y-0.5">
        <div data-testid="product-edit-preview-title">
          <ProductFieldRow label="Title" value={product.title} diff={getDiff('title')} />
        </div>
        <div data-testid="product-edit-preview-price">
          <ProductFieldRow
            label="Price"
            value={formatPrice(product.priceCents, product.currency)}
            diff={
              getDiff('priceCents')
                ? {
                    from: formatPrice(getDiff('priceCents')!.from as number, product.currency),
                    to: formatPrice(getDiff('priceCents')!.to as number, product.currency),
                  }
                : undefined
            }
          />
        </div>
        <div data-testid="product-edit-preview-stock">
          <ProductFieldRow label="Stock" value={String(product.stock)} diff={getDiff('stock')} />
        </div>
        <div data-testid="product-edit-preview-description">
          <ProductFieldRow
            label="Description"
            value={product.description ?? ''}
            isMissing={!product.description}
          />
        </div>
        <div data-testid="product-edit-preview-category">
          <ProductFieldRow
            label="Category"
            value={product.categoryId ?? ''}
            isMissing={!product.categoryId}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1" role="group" aria-label="Product actions">
        <button
          data-testid="product-edit-preview-confirm-btn"
          className="flex-1 bg-gray-900 text-white text-sm rounded-md py-2 px-4 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
          aria-label={mode === 'create' ? 'Confirm and create product' : 'Confirm and update product'}
          onClick={() => onIntent?.({ intent: confirmAction.intent as WidgetIntent['intent'] })}
        >
          {mode === 'create' ? 'Create Product' : 'Confirm Update'}
        </button>
        {editMoreAction && (
          <button
            data-testid="product-edit-preview-edit-more-btn"
            className="border border-gray-300 text-gray-700 text-sm rounded-md py-2 px-4 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            aria-label="Edit product fields"
            onClick={() => onIntent?.({ intent: editMoreAction.intent as WidgetIntent['intent'] })}
          >
            Edit More
          </button>
        )}
      </div>
    </div>
  );
}
