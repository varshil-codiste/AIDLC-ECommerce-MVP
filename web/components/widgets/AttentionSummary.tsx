interface AttentionItem {
  category: 'unfulfilled_order' | 'low_stock' | 'pending_refund';
  entityId: string;
  label: string;
  urgencyScore: number;
  metadata: Record<string, unknown>;
}

interface AttentionSummaryData {
  items: AttentionItem[];
  generatedAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  pending_refund: 'Refund',
  unfulfilled_order: 'Unfulfilled',
  low_stock: 'Low stock',
};

interface Props {
  data: Record<string, unknown>;
}

export function AttentionSummary({ data }: Props) {
  const d = data as unknown as AttentionSummaryData;
  const { items, generatedAt } = d;

  if (!items || items.length === 0) {
    return (
      <div data-testid="attention-summary-root" className="rounded border border-gray-200 p-3 text-sm text-gray-500">
        All caught up — nothing needs your attention right now.
      </div>
    );
  }

  return (
    <div data-testid="attention-summary-root" className="rounded border border-gray-200 p-3 text-sm space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">Needs attention</span>
        <span data-testid="attention-summary-count" className="text-xs text-gray-400">
          {items.length} item{items.length !== 1 ? 's' : ''}
        </span>
      </div>

      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} data-testid={`attention-item-${i}`} className="flex items-center gap-2 text-xs">
            <span
              data-testid={`attention-item-${i}-category`}
              aria-label={`Category: ${CATEGORY_LABELS[item.category] ?? item.category}`}
              className="shrink-0 px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium"
            >
              {CATEGORY_LABELS[item.category] ?? item.category}
            </span>
            <span className="text-gray-700 truncate">{item.label}</span>
          </li>
        ))}
      </ul>

      <div className="text-xs text-gray-300">As of {new Date(generatedAt).toLocaleTimeString()}</div>
    </div>
  );
}
