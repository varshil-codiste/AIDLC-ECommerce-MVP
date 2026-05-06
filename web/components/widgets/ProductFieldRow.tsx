import { DiffBadge } from './DiffBadge';

interface Props {
  label: string;
  value: string;
  diff?: { from: unknown; to: unknown };
  isMissing?: boolean;
}

export function ProductFieldRow({ label, value, diff, isMissing }: Props) {
  const slug = label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div
      data-testid={`product-field-row-${slug}`}
      className="flex items-center justify-between py-1 border-b border-gray-100 last:border-0"
    >
      <span className="text-xs font-medium text-gray-500 w-24 shrink-0">{label}</span>
      <span className={`text-sm flex-1 ${isMissing ? 'text-gray-400 italic' : 'text-gray-800'}`}>
        {isMissing ? 'Not provided' : value}
      </span>
      {diff && <DiffBadge from={diff.from} to={diff.to} />}
    </div>
  );
}
