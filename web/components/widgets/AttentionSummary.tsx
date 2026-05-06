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

const CATEGORY_STYLE: Record<string, { label: string; bg: string; text: string }> = {
  pending_refund: { label: 'Refund', bg: 'bg-rose-100', text: 'text-rose-700' },
  unfulfilled_order: { label: 'Unfulfilled', bg: 'bg-amber-100', text: 'text-amber-700' },
  low_stock: { label: 'Low stock', bg: 'bg-indigo-100', text: 'text-indigo-700' },
};

interface Props {
  data: Record<string, unknown>;
}

export function AttentionSummary({ data }: Props) {
  const d = data as unknown as AttentionSummaryData;
  const { items, generatedAt } = d;

  if (!items || items.length === 0) {
    return (
      <div data-testid="attention-summary-root" className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-sm text-emerald-700 flex items-center gap-2">
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
        All caught up — nothing needs your attention right now.
      </div>
    );
  }

  return (
    <div data-testid="attention-summary-root" className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-transparent">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-indigo-600" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          <span className="font-semibold text-sm text-gray-900">Needs attention</span>
        </div>
        <span data-testid="attention-summary-count" className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
          {items.length} item{items.length !== 1 ? 's' : ''}
        </span>
      </div>

      <ul className="divide-y divide-gray-100">
        {items.map((item, i) => {
          const style = CATEGORY_STYLE[item.category] ?? { label: item.category, bg: 'bg-gray-100', text: 'text-gray-700' };
          return (
            <li key={i} data-testid={`attention-item-${i}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
              <span
                data-testid={`attention-item-${i}-category`}
                aria-label={`Category: ${style.label}`}
                className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}
              >
                {style.label}
              </span>
              <span className="text-sm text-gray-700 truncate flex-1">{item.label}</span>
            </li>
          );
        })}
      </ul>

      <div className="px-4 py-2 bg-gray-50/50 text-xs text-gray-400">
        As of {new Date(generatedAt).toLocaleTimeString()}
      </div>
    </div>
  );
}
