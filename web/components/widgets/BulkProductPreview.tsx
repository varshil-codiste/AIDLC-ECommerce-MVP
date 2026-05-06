'use client';

import { BulkProductRow } from './BulkProductRow';
import type { WidgetIntent } from '@/lib/types/chat.types';

interface BulkProductItem {
  title: string;
  priceCents?: number | null;
  stock?: number | null;
  errors: string[];
}

interface BulkProductPreviewData {
  validCount: number;
  invalidCount: number;
  products: BulkProductItem[];
  confirmAction: { intent: string };
  cancelAction?: { intent: string };
}

interface Props {
  data: Record<string, unknown>;
  onIntent?: (intent: WidgetIntent) => void;
}

export function BulkProductPreview({ data, onIntent }: Props) {
  const d = data as unknown as BulkProductPreviewData;
  const { validCount, invalidCount, products, confirmAction, cancelAction } = d;

  return (
    <div
      data-testid="bulk-product-preview-root"
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Bulk Product Preview
        </span>
        <span
          data-testid="bulk-product-preview-summary"
          className="text-xs text-gray-600"
          aria-live="polite"
        >
          <span className="text-green-600 font-medium">{validCount} valid</span>
          {invalidCount > 0 && (
            <>
              {' · '}
              <span className="text-red-500 font-medium">{invalidCount} invalid</span>
            </>
          )}
        </span>
      </div>

      <div className="space-y-1 max-h-64 overflow-y-auto">
        {products.map((product, i) => (
          <BulkProductRow
            key={i}
            index={i}
            title={product.title}
            priceCents={product.priceCents ?? null}
            stock={product.stock ?? null}
            errors={product.errors}
          />
        ))}
      </div>

      <div className="flex gap-2 pt-1" role="group" aria-label="Bulk create actions">
        <button
          data-testid="bulk-product-preview-confirm-btn"
          disabled={validCount === 0}
          className="flex-1 bg-gray-900 text-white text-sm rounded-md py-2 px-4 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={`Create ${validCount} product${validCount !== 1 ? 's' : ''}`}
          aria-live="assertive"
          onClick={() => onIntent?.({ intent: confirmAction.intent as WidgetIntent['intent'] })}
        >
          Create {validCount} Product{validCount !== 1 ? 's' : ''}
        </button>
        {cancelAction && (
          <button
            data-testid="bulk-product-preview-cancel-btn"
            className="border border-gray-300 text-gray-700 text-sm rounded-md py-2 px-4 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            aria-label="Cancel bulk create"
            onClick={() => onIntent?.({ intent: cancelAction.intent as WidgetIntent['intent'] })}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
