import type { WidgetIntent } from '@/lib/types/chat.types';

interface ConfirmationPromptData {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmIntent: Record<string, unknown>;
  cancelIntent?: Record<string, unknown>;
}

interface Props {
  data: Record<string, unknown>;
  onIntent?: (intent: WidgetIntent) => void;
}

const DEFAULT_CANCEL_INTENT: WidgetIntent = { intent: 'confirmation.cancel' };

export function ConfirmationPrompt({ data, onIntent }: Props) {
  const d = data as unknown as ConfirmationPromptData;

  return (
    <div
      data-testid="confirmation-prompt-root"
      aria-live="assertive"
      className="rounded border border-orange-300 bg-orange-50 p-4 text-sm space-y-3"
    >
      <p
        data-testid="confirmation-prompt-message"
        className="text-gray-900 font-medium leading-snug"
      >
        {d.message}
      </p>

      <div className="flex gap-2">
        <button
          data-testid="confirmation-prompt-confirm-btn"
          className="flex-1 bg-red-600 text-white rounded py-2 text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-600"
          onClick={() => onIntent?.(d.confirmIntent as WidgetIntent)}
        >
          {d.confirmLabel ?? 'Confirm'}
        </button>
        <button
          data-testid="confirmation-prompt-cancel-btn"
          className="flex-1 rounded border border-gray-300 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
          onClick={() => onIntent?.((d.cancelIntent as WidgetIntent) ?? DEFAULT_CANCEL_INTENT)}
        >
          {d.cancelLabel ?? 'Cancel'}
        </button>
      </div>
    </div>
  );
}
