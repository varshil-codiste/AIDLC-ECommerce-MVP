interface Props {
  from: unknown;
  to: unknown;
}

export function DiffBadge({ from, to }: Props) {
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <del data-testid="diff-badge-from" className="text-red-500 line-through">
        {String(from)}
      </del>
      <span aria-hidden="true">→</span>
      <ins data-testid="diff-badge-to" className="text-green-600 no-underline font-medium">
        {String(to)}
      </ins>
    </span>
  );
}
