interface Props {
  index: number;
  title: string;
  priceCents: number | null;
  stock: number | null;
  errors: string[];
}

export function BulkProductRow({ index, title, priceCents, stock, errors }: Props) {
  const isValid = errors.length === 0;
  return (
    <div
      data-testid={`bulk-product-row-${index}`}
      className={`flex items-center gap-3 py-1.5 px-2 rounded text-sm ${isValid ? 'bg-green-50' : 'bg-red-50'}`}
    >
      <span aria-hidden="true" className={`text-base leading-none ${isValid ? 'text-green-600' : 'text-red-500'}`}>
        {isValid ? '✓' : '✗'}
      </span>
      <span className="flex-1 font-medium text-gray-800 truncate">{title}</span>
      {priceCents !== null && (
        <span className="text-gray-500 text-xs">₹{(priceCents / 100).toFixed(0)}</span>
      )}
      {stock !== null && <span className="text-gray-400 text-xs">{stock} in stock</span>}
      {errors.length > 0 && (
        <span
          data-testid={`bulk-product-row-${index}-error`}
          className="text-xs text-red-600 ml-auto"
          role="status"
          aria-label={`Error: ${errors.join(', ')}`}
        >
          {errors[0]}
        </span>
      )}
    </div>
  );
}
