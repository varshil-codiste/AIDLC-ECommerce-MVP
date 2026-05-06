interface ComparedProduct {
  id: string;
  title: string;
  priceCents: number;
  currency: string;
  imageUrl?: string;
  categoryName?: string;
  attributes: Record<string, string>;
}

interface ProductComparisonData {
  products: ComparedProduct[];
  differingAttributes: string[];
}

function formatPrice(cents: number, currency: string): string {
  const amount = (cents / 100).toFixed(2);
  if (currency === 'INR') return `₹${amount}`;
  if (currency === 'USD') return `$${amount}`;
  if (currency === 'EUR') return `€${amount}`;
  return `${currency} ${amount}`;
}

export function ProductComparison({ data }: { data: Record<string, unknown> }) {
  const d = data as unknown as ProductComparisonData;
  const { products, differingAttributes } = d;
  const differingSet = new Set(differingAttributes);

  const allKeys = new Set<string>();
  for (const p of products) for (const k of Object.keys(p.attributes)) allKeys.add(k);
  const sortedKeys = Array.from(allKeys).sort();

  return (
    <div
      data-testid="product-comparison-root"
      className="rounded border border-gray-200 p-3 text-sm overflow-x-auto"
    >
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th scope="col" className="text-left text-xs text-gray-500 font-medium pb-2 pr-3">
              &nbsp;
            </th>
            {products.map((p, i) => (
              <th
                key={p.id}
                scope="col"
                data-testid={`product-comparison-product-${i}-header`}
                className="text-left text-xs font-medium pb-2 px-2 min-w-[120px]"
              >
                <div data-testid={`product-comparison-product-${i}-title`} className="text-gray-800">
                  {p.title}
                </div>
                {p.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imageUrl}
                    alt={p.title}
                    className="mt-1 w-full h-16 object-cover rounded"
                  />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row" className="text-left text-xs text-gray-500 font-normal py-1.5 pr-3">
              Price
            </th>
            {products.map((p, i) => (
              <td
                key={p.id}
                data-testid={`product-comparison-product-${i}-price`}
                className="py-1.5 px-2 text-xs font-medium text-gray-700"
              >
                {formatPrice(p.priceCents, p.currency)}
              </td>
            ))}
          </tr>
          {products.some((p) => p.categoryName) && (
            <tr>
              <th scope="row" className="text-left text-xs text-gray-500 font-normal py-1.5 pr-3">
                Category
              </th>
              {products.map((p) => (
                <td key={p.id} className="py-1.5 px-2 text-xs text-gray-700">
                  {p.categoryName ?? '—'}
                </td>
              ))}
            </tr>
          )}
          {sortedKeys.map((key) => {
            const isDiffering = differingSet.has(key);
            return (
              <tr
                key={key}
                data-testid={`product-comparison-attr-${key}-row`}
                data-differing={isDiffering ? 'true' : 'false'}
                className={isDiffering ? 'bg-amber-50' : ''}
              >
                <th scope="row" className="text-left text-xs text-gray-500 font-normal py-1.5 pr-3">
                  {key}
                  {isDiffering && (
                    <span className="ml-1 text-[10px] text-amber-700 font-medium">(differs)</span>
                  )}
                </th>
                {products.map((p, i) => (
                  <td
                    key={p.id}
                    data-testid={`product-comparison-product-${i}-attr-${key}`}
                    className="py-1.5 px-2 text-xs text-gray-700"
                  >
                    {p.attributes[key] ?? '—'}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
