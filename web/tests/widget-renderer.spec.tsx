import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WidgetRenderer } from '../components/widgets/WidgetRenderer';

describe('WidgetRenderer', () => {
  it('renders ProductCard for valid product_card payload', () => {
    const widget = {
      type: 'product_card',
      data: { productId: 'p1', title: 'Running Shoe', priceCents: 9900, currency: 'INR' },
    };
    render(<WidgetRenderer widget={widget} />);
    expect(screen.getByTestId('product-card-root')).toBeInTheDocument();
    expect(screen.getByTestId('product-card-title').textContent).toBe('Running Shoe');
  });

  it('renders UnknownWidget for schema-invalid payload', () => {
    // product_card requires productId, title, priceCents, currency — missing all
    const widget = { type: 'product_card', data: {} };
    render(<WidgetRenderer widget={widget} />);
    expect(screen.getByText(/couldn't display/i)).toBeInTheDocument();
  });

  it('renders UnknownWidget for unknown widget type', () => {
    const widget = { type: 'alien_widget', data: { foo: 'bar' } };
    render(<WidgetRenderer widget={widget as never} />);
    expect(screen.getByText(/unknown widget type/i)).toBeInTheDocument();
  });

  it('renders confirmation_prompt with aria-live assertive (confirmIntent as object)', () => {
    const widget = {
      type: 'confirmation_prompt',
      data: {
        message: 'Confirm delete?',
        confirmIntent: { intent: 'product.delete' },
      },
    };
    const { container } = render(<WidgetRenderer widget={widget} />);
    const live = container.querySelector('[aria-live="assertive"]');
    expect(live).not.toBeNull();
  });
});
