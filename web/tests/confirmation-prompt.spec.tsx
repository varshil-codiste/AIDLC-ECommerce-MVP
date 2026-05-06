import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmationPrompt } from '../components/widgets/ConfirmationPrompt';

const makeData = (overrides: Record<string, unknown> = {}) => ({
  message: 'Are you sure you want to clear your cart?',
  confirmIntent: { intent: 'confirmation.confirm', action: 'cart.clear' },
  cancelIntent: { intent: 'confirmation.cancel' },
  confirmLabel: 'Yes, clear it',
  cancelLabel: 'Keep cart',
  ...overrides,
});

describe('ConfirmationPrompt', () => {
  it('renders root with aria-live=assertive', () => {
    render(<ConfirmationPrompt data={makeData()} />);
    const root = screen.getByTestId('confirmation-prompt-root');
    expect(root).toBeInTheDocument();
    expect(root.getAttribute('aria-live')).toBe('assertive');
  });

  it('renders the message text', () => {
    render(<ConfirmationPrompt data={makeData()} />);
    expect(screen.getByTestId('confirmation-prompt-message').textContent).toContain(
      'Are you sure you want to clear your cart?'
    );
  });

  it('renders custom confirm and cancel labels', () => {
    render(<ConfirmationPrompt data={makeData()} />);
    expect(screen.getByTestId('confirmation-prompt-confirm-btn').textContent).toBe('Yes, clear it');
    expect(screen.getByTestId('confirmation-prompt-cancel-btn').textContent).toBe('Keep cart');
  });

  it('uses default labels when not provided', () => {
    render(<ConfirmationPrompt data={makeData({ confirmLabel: undefined, cancelLabel: undefined })} />);
    expect(screen.getByTestId('confirmation-prompt-confirm-btn').textContent).toBe('Confirm');
    expect(screen.getByTestId('confirmation-prompt-cancel-btn').textContent).toBe('Cancel');
  });

  it('emits confirmIntent object on Confirm click', () => {
    const onIntent = vi.fn();
    render(<ConfirmationPrompt data={makeData()} onIntent={onIntent} />);
    fireEvent.click(screen.getByTestId('confirmation-prompt-confirm-btn'));
    expect(onIntent).toHaveBeenCalledWith({ intent: 'confirmation.confirm', action: 'cart.clear' });
  });

  it('emits cancelIntent object on Cancel click when provided', () => {
    const onIntent = vi.fn();
    render(<ConfirmationPrompt data={makeData({ cancelIntent: { intent: 'my.cancel' } })} onIntent={onIntent} />);
    fireEvent.click(screen.getByTestId('confirmation-prompt-cancel-btn'));
    expect(onIntent).toHaveBeenCalledWith({ intent: 'my.cancel' });
  });

  it('emits default cancel intent when cancelIntent is absent', () => {
    const onIntent = vi.fn();
    render(<ConfirmationPrompt data={makeData({ cancelIntent: undefined })} onIntent={onIntent} />);
    fireEvent.click(screen.getByTestId('confirmation-prompt-cancel-btn'));
    expect(onIntent).toHaveBeenCalledWith({ intent: 'confirmation.cancel' });
  });

  it('buttons have focus:ring class for accessibility', () => {
    render(<ConfirmationPrompt data={makeData()} />);
    const confirmBtn = screen.getByTestId('confirmation-prompt-confirm-btn');
    const cancelBtn = screen.getByTestId('confirmation-prompt-cancel-btn');
    expect(confirmBtn.className).toContain('focus:ring-2');
    expect(cancelBtn.className).toContain('focus:ring-2');
  });
});
