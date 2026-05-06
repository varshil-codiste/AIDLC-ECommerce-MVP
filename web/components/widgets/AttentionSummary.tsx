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

const CATEGORY_LABEL: Record<string, string> = {
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
      <div data-testid="attention-summary-root" className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-neutral-900 text-white flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-neutral-900">All caught up</div>
            <div className="text-xs text-neutral-500">Nothing needs your attention right now.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="attention-summary-root" className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
        <span className="text-[11px] font-mono text-neutral-400 tracking-wider">NEEDS ATTENTION</span>
        <span data-testid="attention-summary-count" className="text-xs font-medium text-neutral-500 bg-white border border-neutral-200 rounded-full px-2.5 py-0.5">
          {items.length} item{items.length !== 1 ? 's' : ''}
        </span>
      </div>

      <ul className="divide-y divide-neutral-100">
        {items.map((item, i) => (
          <li key={i} data-testid={`attention-item-${i}`} className="flex items-center gap-4 px-5 py-3 hover:bg-neutral-50">
            <span className="text-[11px] font-mono text-neutral-400 tracking-wider w-6">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span
              data-testid={`attention-item-${i}-category`}
              aria-label={`Category: ${CATEGORY_LABEL[item.category] ?? item.category}`}
              className="shrink-0 px-2.5 py-0.5 rounded-full bg-neutral-900 text-white text-[10px] font-semibold uppercase tracking-wider"
            >
              {CATEGORY_LABEL[item.category] ?? item.category}
            </span>
            <span className="text-sm text-neutral-700 truncate flex-1">{item.label}</span>
          </li>
        ))}
      </ul>

      <div className="px-5 py-2.5 bg-neutral-50/50 text-[11px] text-neutral-400 border-t border-neutral-100">
        As of {new Date(generatedAt).toLocaleTimeString()}
      </div>
    </div>
  );
}
