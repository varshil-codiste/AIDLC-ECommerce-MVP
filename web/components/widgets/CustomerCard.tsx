import type { WidgetIntent } from '@/lib/types/chat.types';

interface CustomerData {
  customerId: string;
  email: string;
  name: string | null;
  ltvCents: number;
  currency: string;
  orderCount: number;
  tags: string[];
  anonymized?: boolean;
  viewDetailAction?: { intent: string };
}

interface CustomerCardData {
  customerId?: string;
  customers?: CustomerData[];
}

interface Props {
  data: Record<string, unknown>;
  onIntent?: (intent: WidgetIntent) => void;
}

function SingleCustomer({ customer, onIntent }: { customer: CustomerData; onIntent?: (intent: WidgetIntent) => void }) {
  const { customerId, email, name, ltvCents, orderCount, tags, anonymized, viewDetailAction } = customer;

  return (
    <div data-testid="customer-card-root" className="rounded border border-gray-200 p-3 text-sm space-y-1">
      <div className="flex items-center justify-between">
        <div>
          {name && <div className="font-medium text-sm">{name}</div>}
          <div data-testid="customer-card-email" className="text-xs text-gray-500">
            {anonymized ? <em>anonymized</em> : email}
          </div>
        </div>
        {anonymized && (
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Anonymized</span>
        )}
      </div>

      <div data-testid="customer-card-ltv" className="text-xs text-gray-600">
        LTV: ₹{(ltvCents / 100).toFixed(2)} · {orderCount} order{orderCount !== 1 ? 's' : ''}
      </div>

      {tags.length > 0 && (
        <div data-testid="customer-card-tags" className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span key={tag} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
              {tag}
            </span>
          ))}
        </div>
      )}

      {viewDetailAction && (
        <button
          data-testid="customer-card-view-btn"
          onClick={() => onIntent?.({ intent: viewDetailAction.intent })}
          className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 mt-1 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400"
        >
          View details
        </button>
      )}

      <div className="text-xs text-gray-300 truncate">{customerId}</div>
    </div>
  );
}

export function CustomerCard({ data, onIntent }: Props) {
  const d = data as unknown as CustomerCardData;

  if (d.customers) {
    return (
      <div data-testid="customer-card-list" className="space-y-2">
        {d.customers.map((c, i) => (
          <div key={i} data-testid={`customer-card-list-item-${i}`}>
            <SingleCustomer customer={c} onIntent={onIntent} />
          </div>
        ))}
      </div>
    );
  }

  return <SingleCustomer customer={data as unknown as CustomerData} onIntent={onIntent} />;
}
