interface Props {
  type?: string;
  reason?: string;
}

export function UnknownWidget({ type, reason }: Props) {
  return (
    <div className="rounded border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
      {reason === 'schema.invalid'
        ? "We couldn't display this response. Please try again."
        : `Unknown widget type${type ? `: ${type}` : ''}. Please update the app.`}
    </div>
  );
}
